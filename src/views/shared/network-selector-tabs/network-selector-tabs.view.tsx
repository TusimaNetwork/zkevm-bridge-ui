import React, { FC } from "react";

import { ReactComponent as XMarkIcon } from "src/assets/icons/xmark.svg";
import { useErrorContext } from "src/contexts/error.context";
import { useProvidersContext } from "src/contexts/providers.context";
import { Chain, EthereumChainId } from "src/domain";
import { useCallIfMounted } from "src/hooks/use-call-if-mounted";
import { FromLabel } from "src/utils/labels";
import { isMetaMaskUserRejectedRequestError } from "src/utils/types";
import { Card } from "src/views/shared/card/card.view";
import { useListStyles } from "src/views/shared/network-selector-tabs/network-selector-tabs.styles";
import { Portal } from "src/views/shared/portal/portal.view";
import { Typography } from "src/views/shared/typography/typography.view";

interface NetworkSelectorTabsProps {
  chains: Chain[];
  onClick?:any;
  chainId:number
}

export const NetworkSelectorTabs: FC<NetworkSelectorTabsProps> = ({ onClick,chains,chainId  }) => {
  const classes = useListStyles();
  const { changeNetwork } = useProvidersContext();
  const callIfMounted = useCallIfMounted();
  const { notifyError } = useErrorContext();
  return (
    <div className={classes.card}>
    <div className={classes.list}>
      {chains.map((chain) => (
        <button className={`${classes.button} ${chain.chainId === chainId ? classes.active:''}`} key={chain.key} onClick={() => {
          onClick(chain);
          // changeNetwork(chain).catch((error) => {
          //   callIfMounted(() => {
          //     if (isMetaMaskUserRejectedRequestError(error) === false) {
          //       notifyError(error);
          //     }
          //   });
          // });
        }}>
          {/* <chain.Icon className={classes.icon} /> */}
          <Typography type="body1">{chain.key === 'ethereum'?FromLabel.Deposit:FromLabel.Withdraw}</Typography>
        </button>
      ))}
    </div>
  </div> 
  );
};
