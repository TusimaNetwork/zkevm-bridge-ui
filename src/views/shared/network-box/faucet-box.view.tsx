import { FC } from "react";

import { useEnvContext } from "src/contexts/env.context";
import { useProvidersContext } from "src/contexts/providers.context";
import { useFaucet } from "src/hooks/use-faucet";
import { Card } from "src/views/shared/card/card.view";
import { useNetworkBoxStyles } from "src/views/shared/network-box/network-box.styles";
import { Typography } from "src/views/shared/typography/typography.view";
import { ReactComponent as MetaMaskIcon } from "src/assets/icons/metamask.svg";
export const FaucetBox: FC<{ address: string }> = ({ address }) => {
  const classes = useNetworkBoxStyles();
  const env = useEnvContext();

  const { onFaucet, onAddToken,isAddButtonDisabled,isClaimButtonDisabled } = useFaucet(env?.chains[0], address);
  if (!env) {
    return null;
  }

  const tokens = ['TSM', 'USDT', 'USDC']

  return (
    <Card className={classes.networkProBox}>
      <div className={classes.networkBox}>
        <Typography type="body1">Claim Test Token</Typography>
        <ul className={classes.list_f}>
          {tokens.map((token) => (
            <li key={token} className={classes.listItem_f}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span className={classes.listItem_t}>1000 {token}</span>
            <button
              className={classes.button_mini}
              disabled={isAddButtonDisabled[token]}
              onClick={() => onAddToken(token)}
            >
              <MetaMaskIcon className={classes.buttonIcon} />
              Add {token}
            </button>
            </div> 
          </li>
))}
          {/* <li className={classes.listItem_f}>
            <span>1000 USDT</span>
            <button
              className={classes.button_mini}
              disabled={isAddButtonDisabled.USDT}
              onClick={() => onAddToken('USDT')}
            >
              <MetaMaskIcon className={classes.buttonIcon} />
              Add USDT
            </button>
          </li>
          <li className={classes.listItem_f}>
            <span>1000 USDC</span>
            <button
              className={classes.button_mini}
              disabled={isAddButtonDisabled.USDC}
              onClick={() => onAddToken('USDC')}
            >
              <MetaMaskIcon className={classes.buttonIcon} />
              Add USDC
            </button>
          </li> */}
        </ul>
        <div className={classes.buttons}>
          <button className={classes.button} disabled={isClaimButtonDisabled} onClick={() => onFaucet()}>
            Claim Token
          </button>
          {/* <a
            className={classes.button}
            href={POLYGON_SUPPORT_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            <NewWindowIcon className={classes.buttonIcon} />
            Report an issue
          </a> */}
        </div>
      </div>
    </Card>
  );
};
