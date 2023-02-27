import { AScene } from "aframe";
import { Object3D } from "three";
import { HubsWorld } from "../app";
import { Networked } from "../bit-components";
import { queueDeleteNextPortal, setPortalVisibility } from "../bit-systems/room-portal-system";
import { moveToSpawnPoint } from "../bit-systems/waypoint";
import { CharacterControllerSystem } from "../systems/character-controller-system";
import { createNetworkedEntity } from "./create-networked-entity";
import portalForRoomObjects from "./portal-for-room-objects";
import qsTruthy from "./qs_truthy";

function checkFlag(args: string[], flag: string) {
  return !!args.find(s => s === flag);
}

function usage(
  commandName: string,
  flags: string[] | null,
  options: Map<string, string[]> | null,
  rest: string[] | null
) {
  let str = [];
  str.push(`/${commandName}`);
  if (flags) {
    flags.forEach(flag => {
      str.push(`[${flag}]`);
    });
  }
  if (options) {
    options.forEach((values, key) => {
      str.push(`[${key}=(${values.join(" | ")})]`);
    });
  }
  if (rest) {
    rest.forEach(s => str.push(`<${s}>`));
  }
  return str.join(" ");
}

const FLAG_RESIZE = "--resize";
const FLAG_RECENTER = "--recenter";
const FLAG_ANIMATE_LOAD = "--animate";
const FLAG_NO_OBJECT_MENU = "--no-menu";
const ADD_FLAGS = [FLAG_RESIZE, FLAG_RECENTER, FLAG_ANIMATE_LOAD, FLAG_NO_OBJECT_MENU];
export function add(world: HubsWorld, avatarPov: Object3D, args: string[]) {
  args = args.filter(arg => arg);
  if (args.length) {
    const initialData = {
      src: args[args.length - 1],
      resize: checkFlag(args, FLAG_RESIZE),
      recenter: checkFlag(args, FLAG_RECENTER),
      animateLoad: checkFlag(args, FLAG_ANIMATE_LOAD),
      isObjectMenuTarget: !checkFlag(args, FLAG_NO_OBJECT_MENU)
    };
    console.log("Adding media", initialData);
    const eid = createNetworkedEntity(world, "media", initialData);
    const obj = APP.world.eid2obj.get(eid)!;
    obj.position.copy(avatarPov.localToWorld(new THREE.Vector3(0, 0, -1.5)));
    obj.lookAt(avatarPov.getWorldPosition(new THREE.Vector3()));
  } else {
    console.log(usage("add", ADD_FLAGS, null, ["url"]));
  }
}

export function respawn(world: HubsWorld, scene: AScene, characterController: CharacterControllerSystem) {
  if (!scene.is("entered")) {
    console.error("Cannot respawn until you have entered the room.");
    return;
  }

  if (!qsTruthy("newLoader")) {
    console.error("This command only works with the newLoader query string parameter.");
    return;
  }

  moveToSpawnPoint(world, characterController);
}

export async function portal(world: HubsWorld, avatarPov: Object3D, args: string[]) {
  if (args[0] === "delete") {
    console.log("Ok, will delete the next portal you interact with.");
    queueDeleteNextPortal();
    return;
  }

  const eid = createNetworkedEntity(world, "roomPortal", args[0]);
  const obj = APP.world.eid2obj.get(eid)!;
  obj.position.copy(avatarPov.localToWorld(new THREE.Vector3(0, -0.25, -3.0)));

  const gltfNode = portalForRoomObjects(world, eid);
  await APP.hubChannel!.pin(APP.getString(Networked.id[eid]), gltfNode, null, null, null);
  // obj.lookAt(avatarPov.getWorldPosition(new THREE.Vector3()));
}

export function show(args: string[]) {
  if (args[0] === "portals") {
    setPortalVisibility(true);
  }
}

export function hide(args: string[]) {
  if (args[0] === "portals") {
    setPortalVisibility(false);
  }
}
