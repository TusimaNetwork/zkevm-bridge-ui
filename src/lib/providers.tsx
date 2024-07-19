'use client'

/* Core */
import { Provider } from 'react-redux'
/* Instruments */
import { reduxStore,persistor } from './redux'
import { PersistGate } from "redux-persist/integration/react";

export const Providers = (props: React.PropsWithChildren) => {
 return <PersistGate loading={null} persistor={persistor}>
    <Provider store={reduxStore}>{props.children}</Provider>
    </PersistGate>
}
