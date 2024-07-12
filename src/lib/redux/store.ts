/* Core */
import { configureStore, type ThunkAction, type Action } from '@reduxjs/toolkit'
import {
  useSelector as useReduxSelector,
  useDispatch as useReduxDispatch,
  type TypedUseSelectorHook,
} from 'react-redux'

import { persistStore, persistReducer } from "redux-persist";

import storage from "redux-persist/lib/storage/session";

/* Instruments */
import { reducer } from './rootReducer'


// 持久化配置
const persistConfig = {
  key: "de-index",
  storage,
  timeout:1000,
};
const persistedReducer = persistReducer(persistConfig, reducer);


export const reduxStore = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
export const persistor = persistStore(reduxStore);
// export const reduxStore = configureStore({
//   persistedReducer,
//   middleware: (getDefaultMiddleware) =>
//     getDefaultMiddleware({
//       // serializableCheck: false,
//     }),
//   // middleware: (getDefaultMiddleware) => {
//   //   return getDefaultMiddleware().concat(process.env.NODE_ENV==='development'?middleware:[])
//   // },
// })
export const useDispatch = () => useReduxDispatch<ReduxDispatch>()
export const useSelector: TypedUseSelectorHook<ReduxState> = useReduxSelector

/* Types */
export type ReduxStore = typeof reduxStore
export type ReduxState = ReturnType<typeof reduxStore.getState>
export type ReduxDispatch = typeof reduxStore.dispatch
export type ReduxThunkAction<ReturnType = void> = ThunkAction<
  ReturnType,
  ReduxState,
  unknown,
  Action
>
