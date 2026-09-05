import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

const BASEPATH = "/Cryoplane-Polygonal-Flight";

export function getRouter() {
  return createRouter({
    routeTree,
    basepath: BASEPATH,
    defaultErrorComponent: AppErrorComponent,
  });
}
