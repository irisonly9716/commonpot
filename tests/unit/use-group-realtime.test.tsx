import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Filter = { event: string; schema: string; table: string; filter: string };
type Binding = {
  type: string;
  filter: Filter;
  callback: (payload: unknown) => void;
};
type StatusCallback = (status: string, err?: Error) => void;

// A stand-in for the Supabase browser client: it records what the hook
// subscribes to and lets each test decide what the server reports back.
const realtime = vi.hoisted(() => {
  class FakeChannel {
    bindings: Binding[] = [];
    state = "joining";
    statusCallback: StatusCallback | null = null;

    constructor(
      public topic: string,
      public options: unknown,
    ) {}

    on(type: string, filter: Filter, callback: Binding["callback"]) {
      this.bindings.push({ type, filter, callback });
      return this;
    }

    subscribe(callback: StatusCallback) {
      this.statusCallback = callback;
      return this;
    }

    report(status: string) {
      this.state =
        status === "SUBSCRIBED"
          ? "joined"
          : status === "CLOSED"
            ? "closed"
            : "errored";
      this.statusCallback?.(status);
    }

    insert(table: string) {
      for (const binding of this.bindings) {
        if (binding.filter.table === table) {
          binding.callback({ eventType: "INSERT", table });
        }
      }
    }
  }

  const channels: FakeChannel[] = [];
  const calls: string[] = [];
  const client = {
    channel: vi.fn((topic: string, options: unknown) => {
      calls.push("channel");
      const channel = new FakeChannel(topic, options);
      channels.push(channel);
      return channel;
    }),
    removeChannel: vi.fn(async () => "ok"),
    realtime: {
      setAuth: vi.fn(async () => {
        calls.push("setAuth");
      }),
    },
  };
  return { channels, calls, client };
});

vi.mock("@/lib/db/supabase-browser", () => ({
  createSupabaseBrowserClient: () => realtime.client,
}));

import { useGroupRealtime } from "@/lib/realtime/use-group-realtime";

const groupId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";

function setOnline(online: boolean, notify = true) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => online,
  });
  if (notify) window.dispatchEvent(new Event(online ? "online" : "offline"));
}

async function mountHook() {
  const onChange = vi.fn();
  const view = renderHook(() =>
    useGroupRealtime(groupId, { userId, onChange }),
  );
  // Let the token step finish so the channel exists.
  await act(async () => {});
  const channel = realtime.channels.at(-1);
  if (!channel) throw new Error("the hook did not open a channel");
  return { ...view, onChange, channel };
}

function waitForRefetch() {
  act(() => {
    vi.advanceTimersByTime(250);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  realtime.channels.length = 0;
  realtime.calls.length = 0;
  vi.clearAllMocks();
  setOnline(true, false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("US4 see changes as they happen: useGroupRealtime", () => {
  it("sets the token, then subscribes to the group's activity and my alerts", async () => {
    const { channel } = await mountHook();

    expect(realtime.calls).toEqual(["setAuth", "channel"]);
    expect(channel.options).toMatchObject({
      config: { postgres_changes_options: { wait: true } },
    });
    expect(
      channel.bindings.map((binding) => [binding.type, binding.filter]),
    ).toEqual([
      [
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity",
          filter: `group_id=eq.${groupId}`,
        },
      ],
      [
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alerts",
          filter: `user_id=eq.${userId}`,
        },
      ],
    ]);
  });

  it("is live once subscribed and catches up on anything missed while connecting", async () => {
    const { result, onChange, channel } = await mountHook();
    expect(result.current.status).toBe("connecting");

    act(() => channel.report("SUBSCRIBED"));
    expect(result.current.status).toBe("live");
    waitForRefetch();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("refetches once for a burst of changes", async () => {
    const { onChange, channel } = await mountHook();
    act(() => channel.report("SUBSCRIBED"));
    waitForRefetch();

    act(() => {
      channel.insert("activity");
      channel.insert("activity");
      channel.insert("alerts");
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    waitForRefetch();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("shows Reconnecting when the channel errors or times out, and catches up when it is back", async () => {
    const { result, onChange, channel } = await mountHook();
    act(() => channel.report("SUBSCRIBED"));
    waitForRefetch();

    act(() => channel.report("CHANNEL_ERROR"));
    expect(result.current.status).toBe("reconnecting");
    act(() => channel.report("TIMED_OUT"));
    expect(result.current.status).toBe("reconnecting");

    act(() => channel.report("SUBSCRIBED"));
    expect(result.current.status).toBe("live");
    waitForRefetch();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("subscribes again after the channel closes unexpectedly", async () => {
    const { result, channel } = await mountHook();
    act(() => channel.report("SUBSCRIBED"));

    act(() => channel.report("CLOSED"));
    expect(result.current.status).toBe("reconnecting");
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    await act(async () => {});

    expect(realtime.client.removeChannel).toHaveBeenCalledWith(channel);
    expect(realtime.channels).toHaveLength(2);
    expect(realtime.channels[1].bindings).toHaveLength(2);
  });

  it("shows Reconnecting while the browser is offline and catches up once it is online", async () => {
    const { result, onChange, channel } = await mountHook();
    act(() => channel.report("SUBSCRIBED"));
    waitForRefetch();

    act(() => setOnline(false));
    expect(result.current.status).toBe("reconnecting");
    act(() => channel.insert("activity"));
    waitForRefetch();
    expect(onChange).toHaveBeenCalledTimes(1);

    act(() => setOnline(true));
    expect(result.current.status).toBe("live");
    waitForRefetch();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("waits for the network when it drops before a scheduled refetch runs", async () => {
    const { onChange, channel } = await mountHook();
    // SUBSCRIBED schedules the catch-up refetch; the network drops before it runs.
    act(() => channel.report("SUBSCRIBED"));
    act(() => setOnline(false));
    waitForRefetch();
    expect(onChange).not.toHaveBeenCalled();

    act(() => setOnline(true));
    waitForRefetch();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("stops listening when the component unmounts", async () => {
    const { onChange, channel, unmount } = await mountHook();
    act(() => channel.report("SUBSCRIBED"));
    waitForRefetch();

    unmount();
    expect(realtime.client.removeChannel).toHaveBeenCalledWith(channel);
    channel.insert("activity");
    channel.report("CLOSED");
    vi.advanceTimersByTime(2000);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(realtime.channels).toHaveLength(1);
  });
});
