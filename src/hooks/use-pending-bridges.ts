import { useMemo } from "react";
import { activitySlice, selectActivity, useDispatch, useSelector } from "src/lib/redux";
import useSWR from "swr";

type props ={
  account?:string,
}
export const usePendingBridges = ({account}:props) => {
  const {pendingTx,lists} = useSelector(selectActivity)
  const dispatch = useDispatch(); 
  useSWR({pendingTx,lists,account},account?({account,pendingTx,lists})=>{
    if(!account) {
      return[]
    }
    for(let [key,item] of Object.entries(pendingTx[account] || {})){
      const l_item = lists[account]?.[key]
      if(l_item) {
        dispatch(activitySlice.actions.clearPendingActivity({ account, pendingTx:item }));
      }
    }
  }:null)
  const result = useMemo(()=>{
    if(!account){
      return {
        pendings:[],
        allPendings:[]
      }
    }
    const pendings = Object.values(pendingTx[account] || {})
    return {
      pendings,
      allPendings:[...pendings,...Object.values(lists[account] || {}).filter(itm=>itm.status === 'initiated') as any]
    }
  },[pendingTx,lists,account])
  return result 
}
