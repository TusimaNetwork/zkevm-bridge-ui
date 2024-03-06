import React, { FC } from "react";

import { ReactComponent as XMarkIcon } from "src/assets/icons/xmark.svg";
import { useErrorContext } from "src/contexts/error.context";
import { useProvidersContext } from "src/contexts/providers.context";
import { Chain } from "src/domain";
import { useCallIfMounted } from "src/hooks/use-call-if-mounted";
import { isMetaMaskUserRejectedRequestError } from "src/utils/types";
import { Card } from "src/views/shared/card/card.view";
import { useListStyles } from "src/views/shared/network-selector-tabs/network-selector-tabs.styles";
import { Portal } from "src/views/shared/portal/portal.view";
import { Typography } from "src/views/shared/typography/typography.view";

interface NetworkSelectorTabsProps {
  chains: Chain[];
}

export const NetworkSelectorTabs: FC<NetworkSelectorTabsProps> = ({ chains,  }) => {
  const classes = useListStyles();
  const { changeNetwork } = useProvidersContext();
  const callIfMounted = useCallIfMounted();
  const { notifyError } = useErrorContext();
  return (
    <div className={classes.card}>
    <div className={classes.list}>
      {chains.map((chain) => (
        <button className={classes.button} key={chain.key} onClick={() => {
          changeNetwork(chain).catch((error) => {
            callIfMounted(() => {
              if (isMetaMaskUserRejectedRequestError(error) === false) {
                notifyError(error);
              }
            });
          });
        }}>
          {/* <chain.Icon className={classes.icon} /> */}
          <Typography type="body1">{chain.key === 'polygon-zkevm'?'Deposit':'Withdraw'}</Typography>
        </button>
      ))}
    </div>
  </div> 
  );
};
