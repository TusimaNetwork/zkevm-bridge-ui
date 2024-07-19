import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { addActivityAsync } from "./thunks";
import { Bridge } from "src/domain";
import { PendingTx } from "src/utils/serializers";

const initialState: ActivitySliceState = {
  arttotal: {},
  arrlist: {},
  lists: {},
  pendingTx: {},
};
export const activitySlice = createSlice({
  name: "activity",
  initialState,
  reducers: {
    addListActivity: (state, action: PayloadAction<{ account: string; lists: any[], total: number }>) => {
      const { account, lists, total } = action.payload
      state.arttotal[account] = total
      state.arrlist[account] = lists
    },
    addActivity: (state, action: PayloadAction<{ account: string; bridge: Bridge }>) => {
      const { account, bridge } = action.payload
      const txs = state.lists[account] ?? {}
      txs[`${bridge.from.chainId}-${bridge.depositTxHash}`] = bridge
      state.lists[account] = txs
    },
    modifyActivity: (state, action: PayloadAction<{ account: string; primaryKey: string, modifyData: any }>) => {
      const { account, primaryKey, modifyData } = action.payload
      const txs = state.lists[account] ?? {}
      if (txs[primaryKey]) {
        txs[primaryKey] = {
          ...txs[primaryKey],
          ...modifyData
        }
        state.lists[account] = txs
      }
    },
    addPendingActivity: (state, action: PayloadAction<{ account: string; pendingTx: PendingTx }>) => {
      const { account, pendingTx } = action.payload
      const txs = state.pendingTx[account] ?? {}
      txs[`${pendingTx.from.chainId}-${pendingTx.depositTxHash}`] = pendingTx
      state.pendingTx[account] = txs
    },
    clearPendingActivity: (state, action: PayloadAction<{ account: string; pendingTx: PendingTx }>) => {
      const { account, pendingTx } = action.payload
      const txs = state.pendingTx[account] ?? {}
      const key = `${pendingTx.from.chainId}-${pendingTx.depositTxHash}`
      delete txs[key]
      state.pendingTx[account] = txs
    },
  },
  extraReducers: (builder) => {
    builder.addCase(addActivityAsync.pending, (state) => { })
  }
})

export interface ActivitySliceState {
  arttotal: {
    [account: string]: number
  },
  arrlist: {
    [account: string]: any[]
  }
  lists: {
    [account: string]: {
      [hash: string]: Bridge
    }
  }
  pendingTx: {
    [account: string]: {
      [hash: string]: PendingTx
    }
  }
}
