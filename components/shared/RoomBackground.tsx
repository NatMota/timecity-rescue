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
  "1800_market": "/assets/rooms/1800-market.png",
  "1800_mayorhall": "/assets/rooms/1800-mayorhall.png",
  "1800_reactor": "/assets/rooms/1800-reactor.png",
  "1800_signal_telegraph_office": "/assets/rooms/1800-signal-telegraph-office.png",
  "1800_trainstation": "/assets/rooms/1800-trainstation.png",
  "1800_workshop_lab": "/assets/rooms/1800-workshop-lab.png",
};

export function RoomBackground({ roomSlug }: { roomSlug: string }) {
  const asset = roomAssets[roomSlug];

  return (
    <div className={clsx("room-background", `room-${roomSlug}`)} aria-hidden="true">
      {asset ? (
        <Image src={asset} alt="" fill sizes="100vw" className="room-art" priority={roomSlug === "future_agent_lab"} />
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
