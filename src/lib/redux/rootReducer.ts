/* Instruments */
import { configureStore, combineReducers } from "@reduxjs/toolkit";

import { activitySlice } from './slices'

export const reducer = combineReducers({
  activity:activitySlice.reducer
})
