import { Bridge } from "src/domain";
import { createAppAsyncThunk } from "../../../redux/createAppAsyncThunk";

export const addActivityAsync = createAppAsyncThunk(
  "add/activity",
  async ({ account, bridge }: { account: string; bridge: Bridge }, { dispatch, getState }) => {
    return { account, bridge };
  }
);
