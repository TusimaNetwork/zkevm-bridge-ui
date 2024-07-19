/* Instruments */
import { combineReducers } from "@reduxjs/toolkit";

import { activitySlice,tokensSlice} from './slices'

export const reducer = combineReducers({
  activity:activitySlice.reducer,
  tokens:tokensSlice.reducer
})
