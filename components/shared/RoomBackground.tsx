import clsx from "clsx";
import Image from "next/image";

const roomAssets: Record<string, string> = {
  future_agent_lab: "/assets/rooms/future-agent-lab.png",
  future_agent_lab_return: "/assets/rooms/future-agent-lab.png",
  future_market: "/assets/rooms/future-market.png",
  future_mayorhall: "/assets/rooms/future-mayorhall.png",
  future_reactorcore: "/assets/rooms/future-reactorcore.png",
  future_signal_tower: "/assets/rooms/future-signal-tower.png",
  future_trainstation: "/assets/rooms/future-trainstation.png",
};

export function RoomBackground({ roomSlug }: { roomSlug: string }) {
  const asset = roomAssets[roomSlug];

  return (
    <div className={clsx("room-background", `room-${roomSlug}`)} aria-hidden="true">
      {asset ? (
        <Image src={asset} alt="" fill sizes="(max-width: 900px) 100vw, 44vw" className="room-art" priority={roomSlug === "future_agent_lab"} />
      ) : (
        <>
          <div className="voxel-sky" />
          <div className="voxel-grid">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="room-blocks">
            <i />
            <i />
            <i />
            <i />
          </div>
        </>
      )}
      <div className="room-vignette" />
    </div>
  );
}
