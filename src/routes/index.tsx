import { createFileRoute } from "@tanstack/react-router";
import { GameApp } from "@/components/game/GameCanvas";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <GameApp />;
}
