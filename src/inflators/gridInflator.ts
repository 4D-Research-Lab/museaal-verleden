import { addComponent } from "bitecs";
import { HubsWorld } from "../app";
import { Grid } from "../bit-components";

export type GridParams = {
    rows?: number;
};

const DEFAULTS: Required<GridParams> = {
    rows: 0.0
};

export function inflateGrid(
    world: HubsWorld,
    eid: number,
    params: GridParams
) {
    params = Object.assign({}, params, DEFAULTS) as Required<GridParams>;
    addComponent(world, Grid, eid);
    Grid.rows[eid] = 1;
}