import { FC, useMemo, useRef, useState } from "react";

import { useEnvContext } from "src/contexts/env.context";
import { useTokensContext } from "src/contexts/tokens.context";
import { DepositResult } from "src/domain";
import { useBridges } from "src/hooks/use-bridges";
import { useIntersection } from "src/hooks/use-intersection";
import { useActivityStyles } from "src/views/activity/activity.styles";
import { InfiniteScroll } from "src/views/activity/components/infinite-scroll/infinite-scroll.view";
import { Card } from "src/views/shared/card/card.view";
import { Header } from "src/views/shared/header/header.view";
import { PageLoader } from "src/views/shared/page-loader/page-loader.view";
import { Typography } from "src/views/shared/typography/typography.view";
import { ReadBridgeCard } from "./components/bridge-card/read-bridge-card.view";
import { useLastVerifiedBatch } from "src/hooks/use-last-verified-batch";
import { usePendingBridges } from "src/hooks/use-pending-bridges";
import { useActiveChainId } from "src/hooks/use-active-chainId";
import { PendingTx } from "src/utils/serializers";
import { LoadBridgeCard } from "./components/bridge-card/load-bridge-card.view";
import { PAGE_SIZE } from "src/constants";

export const Activity: FC = () => {
  const env = useEnvContext();
  const { tokens } = useTokensContext();
  const {account,chainId} = useActiveChainId()
  const [displayAll, setDisplayAll] = useState(true);
  const classes = useActivityStyles();
  const [page,setPage] = useState(1)

  const headerBorderObserved = useRef<HTMLDivElement>(null)
  const headerBorderTarget = useRef<HTMLDivElement>(null)

  useIntersection({
    className: classes.stickyContentBorder,
    observed: headerBorderObserved,
    target: headerBorderTarget,
  })

  const {deposits,total:total_cnt} = useBridges({account,page})
  // console.log({total})
  const {pendings,allPendings} = usePendingBridges({account})
  const onDisplayAll = () => setDisplayAll(true)
  const onDisplayPending = () => setDisplayAll(false)

  const pendingsBridges = useMemo(()=>{
    if(!deposits){
      return []
    }
    return pendings.filter(
      (pendingBridge) => deposits.find(
          (apiBridge) => pendingBridge.depositTxHash === apiBridge.tx_hash
        ) === undefined
    )
  },[deposits,pendings])
  const offset = useMemo(()=>  total_cnt === null ? 0 : page * PAGE_SIZE,[total_cnt,page,PAGE_SIZE])
  const total=useMemo(()=>Number(pendings.length || 0 ) + Number(total_cnt || 0),[total_cnt,pendings])
  const mergeBridges = (pendingBridges: PendingTx[],apiBridges?: DepositResult[]) => {
    if(!apiBridges){
      return []
    }
    return [
     ...pendingBridges, 
      ...apiBridges
    ]
  }
  const allBridges = useMemo(()=>{
    return mergeBridges(pendings,deposits)
  },[mergeBridges,pendingsBridges,deposits])

  const onLoadNextPage = () => {
    if(total === null || total > offset){
      console.log("onLoadNextPage")
      setPage(page+1)
    }
  };

    const lastVerifiedBatch = useLastVerifiedBatch(env)

  const EmptyMessage = () => (
    <Card className={classes.emptyMessage}>
      {displayAll
        ? "Bridge activity will be shown here"
        : "There are no pending bridges at the moment"}
    </Card>
  )
  function isPendingTx(bridge: any): bridge is PendingTx {
    return bridge.type === 'deposit' 
  }
  const Tabs = ({ all, pending }: { all: number; pending: number }) => (
    <div className={classes.filterBoxes}>
      <div
        className={`${classes.filterBox} ${displayAll ? classes.filterBoxSelected : ""}`}
        onClick={onDisplayAll}
      >
        <Typography className={classes.filterBoxLabel} type="body1">
          All
        </Typography>
        <Typography
          className={`${classes.filterNumberBox} ${
            displayAll ? classes.filterNumberBoxSelected : ""
          }`}
          type="body2"
        >
          {all}
        </Typography>
      </div>
      <div
        className={`${classes.filterBox} ${!displayAll ? classes.filterBoxSelected : ""}`}
        onClick={onDisplayPending}
      >
        <Typography className={classes.filterBoxLabel} type="body1">
          Pending
        </Typography>
        <Typography
          className={`${classes.filterNumberBox} ${
            !displayAll ? classes.filterNumberBoxSelected : ""
          }`}
          type="body2"
        >
          {pending}
        </Typography>
      </div>
    </div>
  );

  const loader = (
    <div className={classes.contentWrapper}>
      <Header backTo={{ routeKey: "home" }} title="Activity" />
      <Tabs all={0} pending={0} />
      <PageLoader />
    </div>
  )

  if (!env || !tokens ) {
    return loader;
  }
      const filteredList =displayAll ? allBridges:allPendings
      return (
        <>
          <div ref={headerBorderObserved}></div>
          <div className={classes.stickyContent} ref={headerBorderTarget}>
            <div className={classes.contentWrapper}>
              <Header backTo={{ routeKey: "home" }} title="Activity" />
              {/* <Tabs all={allBridges.length} pending={pendingBridges?.data.length} /> */}
              <Tabs all={total} pending={allPendings?.length || 0} />
            </div>
          </div>
          <div className={classes.contentWrapper}>
           
            {filteredList.length ? (
              <InfiniteScroll
                // isLoading={apiBridges.status === "loading-more-items"}
                isLoading={false}
                onLoadNextPage={onLoadNextPage} >
                {filteredList.map((bridge,index) =>
                  isPendingTx(bridge) ? (
                    <div className={classes.bridgeCardwrapper} key={bridge.depositTxHash}>
                      <LoadBridgeCard apiDeposit={bridge} />
                    </div>
                  ) : (
                    <div className={classes.bridgeCardwrapper} key={index}>
                      <ReadBridgeCard
                        apiDeposit={bridge}
                        env={env}
                        lastVerifiedBatch={lastVerifiedBatch} />
                    </div>
                  )
                )}
              </InfiniteScroll>
            ) : (
              <EmptyMessage />
            )}
          </div>
        </>
      );
    // }
  // }
};
