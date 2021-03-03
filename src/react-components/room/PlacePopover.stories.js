import React from "react";
import { RoomLayout } from "../layout/RoomLayout";
import { ReactComponent as PenIcon } from "../icons/Pen.svg";
import { ReactComponent as CameraIcon } from "../icons/Camera.svg";
import { ReactComponent as TextIcon } from "../icons/Text.svg";
import { ReactComponent as LinkIcon } from "../icons/Link.svg";
import { ReactComponent as GIFIcon } from "../icons/GIF.svg";
import { ReactComponent as ObjectIcon } from "../icons/Object.svg";
import { ReactComponent as AvatarIcon } from "../icons/Avatar.svg";
import { ReactComponent as SceneIcon } from "../icons/Scene.svg";
import { ReactComponent as UploadIcon } from "../icons/Upload.svg";
import { PlacePopoverButton } from "./PlacePopover";

export default {
  title: "Room/PlacePopover",
  parameters: {
    layout: "fullscreen"
  }
};

const items = [
  { id: "pen", icon: PenIcon, color: "purple", label: "Pen" },
  { id: "camera", icon: CameraIcon, color: "purple", label: "Camera" },
  { id: "text", icon: TextIcon, color: "blue", label: "Text" },
  { id: "link", icon: LinkIcon, color: "blue", label: "Link" },
  { id: "gif", icon: GIFIcon, color: "orange", label: "GIF" },
  { id: "model", icon: ObjectIcon, color: "orange", label: "3D Model" },
  { id: "avatar", icon: AvatarIcon, color: "red", label: "Avatar" },
  { id: "scene", icon: SceneIcon, color: "red", label: "Scene" },
  { id: "upload", icon: UploadIcon, color: "green", label: "Upload" }
];

export const Base = () => <RoomLayout toolbarCenter={<PlacePopoverButton items={items} />} />;
