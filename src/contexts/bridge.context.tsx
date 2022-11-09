import {
  BigNumber,
  constants as ethersConstants,
  ContractTransaction,
  CallOverrides,
} from "ethers";
import { createContext, FC, useContext, useCallback, useMemo, PropsWithChildren } from "react";

import { useEnvContext } from "src/contexts/env.context";
import { useProvidersContext } from "src/contexts/providers.context";
import { usePriceOracleContext } from "src/contexts/price-oracle.context";
import { useTokensContext } from "src/contexts/tokens.context";
import { Bridge__factory } from "src/types/contracts/bridge";
import {
  BRIDGE_CALL_GAS_LIMIT_INCREASE_PERCENTAGE,
  BRIDGE_CALL_PERMIT_GAS_LIMIT_INCREASE,
  FIAT_DISPLAY_PRECISION,
  GAS_PRICE_INCREASE_PERCENTAGE,
  PENDING_TX_TIMEOUT,
} from "src/constants";
import { multiplyAmounts } from "src/utils/amounts";
import { serializeBridgeId } from "src/utils/serializers";
import { selectTokenAddress } from "src/utils/tokens";
import { isAsyncTaskDataAvailable } from "src/utils/types";
import { getDeposit, getDeposits, getMerkleProof } from "src/adapters/bridge-api";
import {
  permit,
  getErc20TokenEncodedMetadata,
  isTxCanceled,
  isTxMined,
  hasTxBeenReverted,
} from "src/adapters/ethereum";
import {
  Env,
  Chain,
  Token,
  Bridge,
  OnHoldBridge,
  Deposit,
  PendingBridge,
  Gas,
  TokenSpendPermission,
} from "src/domain";
import * as storage from "src/adapters/storage";

interface GetMaxEtherBridgeParams {
  chain: Chain;
}

interface EstimateBridgeGasParams {
  from: Chain;
  to: Chain;
  token: Token;
  destinationAddress: string;
  tokenSpendPermission: TokenSpendPermission;
}

type FetchBridgeParams = {
  env: Env;
  networkId: number;
  depositCount: number;
  abortSignal?: AbortSignal;
};

interface GetBridgesParams {
  env: Env;
  ethereumAddress: string;
  limit: number;
  offset: number;
  abortSignal?: AbortSignal;
}

interface RefreshBridgesParams {
  env: Env;
  ethereumAddress: string;
  quantity: number;
  abortSignal?: AbortSignal;
}

type FetchBridgesParams = {
  env: Env;
  ethereumAddress: string;
  abortSignal?: AbortSignal;
} & (
  | {
      type: "load";
      limit: number;
      offset: number;
    }
  | {
      type: "reload";
      quantity: number;
    }
);

interface BridgeParams {
  from: Chain;
  token: Token;
  amount: BigNumber;
  to: Chain;
  destinationAddress: string;
  tokenSpendPermission: TokenSpendPermission;
  gas?: Gas;
}

interface ClaimParams {
  bridge: OnHoldBridge;
}

interface BridgeContext {
  getMaxEtherBridge: (params: GetMaxEtherBridgeParams) => Promise<BigNumber>;
  estimateBridgeGas: (params: EstimateBridgeGasParams) => Promise<Gas>;
  fetchBridge: (params: FetchBridgeParams) => Promise<Bridge>;
  fetchBridges: (params: FetchBridgesParams) => Promise<{
    bridges: Bridge[];
    total: number;
  }>;
  getPendingBridges: (bridges?: Bridge[]) => Promise<PendingBridge[]>;
  bridge: (params: BridgeParams) => Promise<ContractTransaction>;
  claim: (params: ClaimParams) => Promise<ContractTransaction>;
}

const bridgeContextNotReadyErrorMsg = "The bridge context is not yet ready";

const bridgeContext = createContext<BridgeContext>({
  getMaxEtherBridge: () => {
    return Promise.reject(bridgeContextNotReadyErrorMsg);
  },
  estimateBridgeGas: () => {
    return Promise.reject(bridgeContextNotReadyErrorMsg);
  },
  fetchBridge: () => {
    return Promise.reject(bridgeContextNotReadyErrorMsg);
  },
  fetchBridges: () => {
    return Promise.reject(bridgeContextNotReadyErrorMsg);
  },
  getPendingBridges: () => {
    return Promise.reject(bridgeContextNotReadyErrorMsg);
  },
  bridge: () => {
    return Promise.reject(bridgeContextNotReadyErrorMsg);
  },
  claim: () => {
    return Promise.reject(bridgeContextNotReadyErrorMsg);
  },
});

const BridgeProvider: FC<PropsWithChildren> = (props) => {
  const env = useEnvContext();
  const { connectedProvider, changeNetwork } = useProvidersContext();
  const { getToken, addWrappedToken } = useTokensContext();
  const { getTokenPrice } = usePriceOracleContext();

  const getMaxEtherBridge = useCallback(
    ({ chain }: GetMaxEtherBridgeParams): Promise<BigNumber> => {
      return Bridge__factory.connect(chain.bridgeContractAddress, chain.provider).maxEtherBridge();
    },
    []
  );

  type Price = BigNumber | null;
  type TokenPrices = Partial<Record<string, Price>>;

  const fetchBridge = useCallback(
    async ({ env, networkId, depositCount, abortSignal }: FetchBridgeParams): Promise<Bridge> => {
      const apiUrl = env.bridgeApiUrl;
      const apiDeposit = await getDeposit({
        apiUrl,
        networkId,
        depositCount,
        abortSignal,
      });

      const {
        network_id,
        dest_net,
        amount,
        dest_addr,
        deposit_cnt,
        tx_hash,
        claim_tx_hash,
        token_addr,
        orig_net,
        ready_for_claim,
      } = apiDeposit;

      const from = env.chains.find((chain) => chain.networkId === network_id);
      if (from === undefined) {
        throw new Error(
          `The specified network_id "${network_id}" can not be found in the list of supported Chains`
        );
      }

      const to = env.chains.find((chain) => chain.networkId === dest_net);
      if (to === undefined) {
        throw new Error(
          `The specified dest_net "${dest_net}" can not be found in the list of supported Chains`
        );
      }

      const token = await getToken({
        env,
        tokenAddress: token_addr,
        originNetwork: orig_net,
        chain: from,
      });

      const claim: Deposit["claim"] =
        claim_tx_hash !== null
          ? { status: "claimed", txHash: claim_tx_hash }
          : ready_for_claim
          ? { status: "ready" }
          : { status: "pending" };

      const tokenPrice: BigNumber | undefined = env.fiatExchangeRates.areEnabled
        ? await getTokenPrice({
            token,
            chain: from,
          }).catch(() => undefined)
        : undefined;

      const fiatAmount =
        tokenPrice &&
        multiplyAmounts(
          {
            value: tokenPrice,
            precision: FIAT_DISPLAY_PRECISION,
          },
          {
            value: BigNumber.from(amount),
            precision: token.decimals,
          },
          FIAT_DISPLAY_PRECISION
        );

      const id = serializeBridgeId({
        depositCount,
        networkId,
      });

      switch (claim.status) {
        case "pending": {
          return {
            status: "initiated",
            id,
            from,
            to,
            token,
            fiatAmount,
            amount: BigNumber.from(amount),
            destinationAddress: dest_addr,
            depositCount: deposit_cnt,
            depositTxHash: tx_hash,
            tokenOriginNetwork: orig_net,
          };
        }
        case "ready": {
          return {
            status: "on-hold",
            id,
            from,
            to,
            token,
            fiatAmount,
            amount: BigNumber.from(amount),
            destinationAddress: dest_addr,
            depositCount: deposit_cnt,
            depositTxHash: tx_hash,
            tokenOriginNetwork: orig_net,
          };
        }
        case "claimed": {
          return {
            status: "completed",
            id,
            from,
            to,
            token,
            fiatAmount,
            amount: BigNumber.from(amount),
            destinationAddress: dest_addr,
            depositCount: deposit_cnt,
            depositTxHash: tx_hash,
            tokenOriginNetwork: orig_net,
            claimTxHash: claim.txHash,
          };
        }
      }
    },
    [getTokenPrice, getToken]
  );

  const getBridges = useCallback(
    async ({
      env,
      ethereumAddress,
      limit,
      offset,
      abortSignal,
    }: GetBridgesParams): Promise<{
      bridges: Bridge[];
      total: number;
    }> => {
      const apiUrl = env.bridgeApiUrl;
      const { deposits: apiDeposits, total } = await getDeposits({
        apiUrl,
        ethereumAddress,
        limit,
        offset,
        abortSignal,
      });

      const deposits = await Promise.all(
        apiDeposits.map(async (apiDeposit): Promise<Deposit> => {
          const {
            network_id,
            dest_net,
            amount,
            dest_addr,
            deposit_cnt,
            tx_hash,
            claim_tx_hash,
            token_addr,
            orig_net,
            ready_for_claim,
          } = apiDeposit;

          const from = env.chains.find((chain) => chain.networkId === network_id);
          if (from === undefined) {
            throw new Error(
              `The specified network_id "${network_id}" can not be found in the list of supported Chains`
            );
          }

          const to = env.chains.find((chain) => chain.networkId === dest_net);
          if (to === undefined) {
            throw new Error(
              `The specified dest_net "${dest_net}" can not be found in the list of supported Chains`
            );
          }

          const token = await getToken({
            env,
            tokenAddress: token_addr,
            originNetwork: orig_net,
            chain: from,
          });

          return {
            token,
            amount: BigNumber.from(amount),
            fiatAmount: undefined,
            destinationAddress: dest_addr,
            depositCount: deposit_cnt,
            depositTxHash: tx_hash,
            from,
            to,
            tokenOriginNetwork: orig_net,
            claim:
              claim_tx_hash !== null
                ? { status: "claimed", txHash: claim_tx_hash }
                : ready_for_claim
                ? { status: "ready" }
                : { status: "pending" },
          };
        })
      );

      const tokenPrices: TokenPrices = env.fiatExchangeRates.areEnabled
        ? await deposits.reduce(
            async (
              accTokenPrices: Promise<TokenPrices>,
              deposit: Deposit
            ): Promise<TokenPrices> => {
              const tokenPrices = await accTokenPrices;
              const tokenCachedPrice = tokenPrices[deposit.token.address];
              const tokenPrice =
                tokenCachedPrice !== undefined
                  ? tokenCachedPrice
                  : await getTokenPrice({ token: deposit.token, chain: deposit.from }).catch(
                      () => null
                    );

              return {
                ...tokenPrices,
                [deposit.token.address]: tokenPrice,
              };
            },
            Promise.resolve({})
          )
        : {};

      const bridges = deposits.map((partialDeposit): Bridge => {
        const {
          token,
          amount,
          destinationAddress,
          depositCount,
          depositTxHash,
          from,
          to,
          tokenOriginNetwork,
          claim,
        } = partialDeposit;

        const tokenPrice = tokenPrices[token.address];

        const fiatAmount =
          tokenPrice !== undefined && tokenPrice !== null
            ? multiplyAmounts(
                {
                  value: tokenPrice,
                  precision: FIAT_DISPLAY_PRECISION,
                },
                {
                  value: amount,
                  precision: token.decimals,
                },
                FIAT_DISPLAY_PRECISION
              )
            : undefined;

        const id = serializeBridgeId({
          depositCount,
          networkId: from.networkId,
        });

        switch (claim.status) {
          case "pending": {
            return {
              status: "initiated",
              id,
              token,
              amount,
              destinationAddress,
              depositCount,
              depositTxHash,
              from,
              to,
              tokenOriginNetwork,
              fiatAmount,
            };
          }
          case "ready": {
            return {
              status: "on-hold",
              id,
              token,
              amount,
              destinationAddress,
              depositCount,
              depositTxHash,
              from,
              to,
              tokenOriginNetwork,
              fiatAmount,
            };
          }
          case "claimed": {
            return {
              status: "completed",
              id,
              token,
              amount,
              destinationAddress,
              depositCount,
              depositTxHash,
              from,
              to,
              tokenOriginNetwork,
              claimTxHash: claim.txHash,
              fiatAmount,
            };
          }
        }
      });

      return {
        bridges,
        total,
      };
    },
    [getTokenPrice, getToken]
  );

  const REFRESH_PAGE_SIZE = 100;

  const refreshBridges = useCallback(
    async ({
      env,
      ethereumAddress,
      quantity,
      abortSignal,
    }: RefreshBridgesParams): Promise<{
      bridges: Bridge[];
      total: number;
    }> => {
      const completePages = Math.floor(quantity / REFRESH_PAGE_SIZE);
      const remainderBridges = quantity % REFRESH_PAGE_SIZE;
      const requiredRequests = Math.max(
        remainderBridges === 0 ? completePages : completePages + 1,
        1
      );
      return (
        await Promise.all(
          Array(requiredRequests)
            .fill(null)
            .map((_, index) => {
              const offset = index * REFRESH_PAGE_SIZE;
              const isLast = index + 1 === requiredRequests;
              const isRemainderRequestRequired = isLast && remainderBridges !== 0;
              const limit = isRemainderRequestRequired ? remainderBridges : REFRESH_PAGE_SIZE;
              return getBridges({
                env,
                ethereumAddress,
                limit,
                offset,
                abortSignal,
              });
            })
        )
      ).reduce((acc, curr) => ({ bridges: [...acc.bridges, ...curr.bridges], total: curr.total }), {
        bridges: [],
        total: 0,
      });
    },
    [getBridges]
  );

  const fetchBridges = useCallback(
    async (
      params: FetchBridgesParams
    ): Promise<{
      bridges: Bridge[];
      total: number;
    }> => {
      if (params.type === "load") {
        return getBridges({
          env: params.env,
          ethereumAddress: params.ethereumAddress,
          limit: params.limit,
          offset: params.offset,
          abortSignal: params.abortSignal,
        });
      } else {
        return refreshBridges({
          env: params.env,
          ethereumAddress: params.ethereumAddress,
          quantity: params.quantity,
          abortSignal: params.abortSignal,
        });
      }
    },
    [getBridges, refreshBridges]
  );

  const cleanPendingTxs = useCallback(
    async (bridges: Bridge[]): Promise<void> => {
      if (!env) {
        return Promise.reject("Env is not defined");
      }
      if (!isAsyncTaskDataAvailable(connectedProvider)) {
        return Promise.reject("connectedProvider data is not available");
      }

      const account = connectedProvider.data.account;
      const pendingTxs = storage.getAccountPendingTxs(account, env);
      const isPendingDepositInApiBridges = (depositTxHash: string) => {
        return bridges.find((bridge) => {
          return (
            (bridge.status === "initiated" || bridge.status === "on-hold") &&
            bridge.depositTxHash === depositTxHash
          );
        });
      };
      const isPendingClaimInApiBridges = (claimTxHash: string) => {
        return bridges.find((bridge) => {
          return bridge.status === "completed" && bridge.claimTxHash === claimTxHash;
        });
      };

      await Promise.all(
        pendingTxs.map(async (pendingTx) => {
          if (
            pendingTx.type === "deposit" &&
            isPendingDepositInApiBridges(pendingTx.depositTxHash)
          ) {
            return storage.removeAccountPendingTx(account, env, pendingTx.depositTxHash);
          }

          if (pendingTx.type === "claim" && isPendingClaimInApiBridges(pendingTx.claimTxHash)) {
            return storage.removeAccountPendingTx(account, env, pendingTx.depositTxHash);
          }

          const txHash =
            pendingTx.type === "deposit" ? pendingTx.depositTxHash : pendingTx.claimTxHash;
          const provider =
            pendingTx.type === "deposit" ? pendingTx.from.provider : pendingTx.to.provider;
          const tx = await provider.getTransaction(txHash);

          if (isTxCanceled(tx)) {
            return storage.removeAccountPendingTx(account, env, pendingTx.depositTxHash);
          }

          if (isTxMined(tx)) {
            const txReceipt = await provider.getTransactionReceipt(txHash);

            if (hasTxBeenReverted(txReceipt)) {
              return storage.removeAccountPendingTx(account, env, pendingTx.depositTxHash);
            }
          }

          if (Date.now() > pendingTx.timestamp + PENDING_TX_TIMEOUT) {
            return storage.removeAccountPendingTx(account, env, pendingTx.depositTxHash);
          }
        })
      );
    },
    [connectedProvider, env]
  );

  const getPendingBridges = useCallback(
    async (bridges?: Bridge[]): Promise<PendingBridge[]> => {
      if (bridges) {
        await cleanPendingTxs(bridges);
      }

      if (!env) {
        throw new Error("Env is not available");
      }

      if (!isAsyncTaskDataAvailable(connectedProvider)) {
        return Promise.reject("connectedProvider data is not available");
      }

      return Promise.all(
        storage.getAccountPendingTxs(connectedProvider.data.account, env).map(async (tx) => {
          const chain = env.chains.find((chain) => chain.key === tx.from.key);
          const token = await addWrappedToken({ token: tx.token });
          const tokenPrice =
            chain && env.fiatExchangeRates.areEnabled
              ? await getTokenPrice({ token: tx.token, chain })
              : undefined;
          const fiatAmount =
            tokenPrice &&
            multiplyAmounts(
              {
                value: tokenPrice,
                precision: FIAT_DISPLAY_PRECISION,
              },
              {
                value: tx.amount,
                precision: token.decimals,
              },
              FIAT_DISPLAY_PRECISION
            );

          return {
            status: "pending",
            from: tx.from,
            to: tx.to,
            destinationAddress: tx.destinationAddress,
            depositTxHash: tx.depositTxHash,
            claimTxHash: tx.type === "claim" ? tx.claimTxHash : undefined,
            token,
            amount: tx.amount,
            fiatAmount,
          };
        })
      );
    },
    [env, connectedProvider, cleanPendingTxs, addWrappedToken, getTokenPrice]
  );

  const estimateBridgeGas = useCallback(
    async ({
      from,
      to,
      token,
      destinationAddress,
      tokenSpendPermission,
    }: EstimateBridgeGasParams): Promise<Gas> => {
      const contract = Bridge__factory.connect(from.bridgeContractAddress, from.provider);
      const amount = BigNumber.from(0);
      const overrides: CallOverrides =
        token.address === ethersConstants.AddressZero
          ? { value: amount, from: destinationAddress }
          : { from: destinationAddress };

      const gasLimit =
        from.key === "ethereum"
          ? await contract.estimateGas
              .bridge(
                selectTokenAddress(token, from),
                to.networkId,
                destinationAddress,
                amount,
                "0x",
                overrides
              )
              .then((gasLimit) => {
                const gasLimitIncrease = gasLimit
                  .div(BigNumber.from(100))
                  .mul(BRIDGE_CALL_GAS_LIMIT_INCREASE_PERCENTAGE);

                const permitGasLimitIncrease = BigNumber.from(
                  BRIDGE_CALL_PERMIT_GAS_LIMIT_INCREASE
                );

                return tokenSpendPermission.type === "permit"
                  ? gasLimit.add(gasLimitIncrease).add(permitGasLimitIncrease)
                  : gasLimit.add(gasLimitIncrease);
              })
          : BigNumber.from(300000);

      const { maxFeePerGas, gasPrice } = await from.provider.getFeeData();

      if (maxFeePerGas) {
        return { type: "eip-1559", data: { gasLimit, maxFeePerGas } };
      } else {
        const legacyGasPrice = gasPrice || (await from.provider.getGasPrice());
        const gasPriceIncrease = legacyGasPrice
          .div(BigNumber.from(100))
          .mul(GAS_PRICE_INCREASE_PERCENTAGE);

        return {
          type: "legacy",
          data: {
            gasLimit,
            gasPrice: legacyGasPrice.add(gasPriceIncrease),
          },
        };
      }
    },
    []
  );

  const bridge = useCallback(
    async ({
      from,
      token,
      amount,
      to,
      destinationAddress,
      tokenSpendPermission,
      gas,
    }: BridgeParams): Promise<ContractTransaction> => {
      if (env === undefined) {
        throw new Error("Env is not available");
      }

      if (!isAsyncTaskDataAvailable(connectedProvider)) {
        throw new Error("Connected provider is not available");
      }

      const { provider, account, chainId } = connectedProvider.data;
      const contract = Bridge__factory.connect(from.bridgeContractAddress, provider.getSigner());
      const overrides: CallOverrides = {
        value: token.address === ethersConstants.AddressZero ? amount : undefined,
        ...(gas
          ? gas.data
          : (await estimateBridgeGas({ from, to, token, destinationAddress, tokenSpendPermission }))
              .data),
      };

      const executeBridge = async () => {
        const permitData =
          tokenSpendPermission.type === "permit"
            ? await permit({
                token,
                provider: provider,
                account: account,
                spender: from.bridgeContractAddress,
                value: amount,
                permit: tokenSpendPermission.permit,
              })
            : "0x";

        return contract
          .bridge(token.address, to.networkId, destinationAddress, amount, permitData, overrides)
          .then((txData) => {
            storage.addAccountPendingTx(account, env, {
              type: "deposit",
              depositTxHash: txData.hash,
              destinationAddress,
              from,
              to,
              timestamp: Date.now(),
              token,
              amount,
            });

            return txData;
          });
      };

      if (from.chainId === chainId) {
        return executeBridge();
      } else {
        return changeNetwork(from)
          .catch(() => {
            throw "wrong-network";
          })
          .then(executeBridge);
      }
    },
    [env, connectedProvider, estimateBridgeGas, changeNetwork]
  );

  const claim = useCallback(
    async ({
      bridge: {
        token,
        amount,
        tokenOriginNetwork,
        from,
        to,
        destinationAddress,
        depositCount,
        depositTxHash,
      },
    }: ClaimParams): Promise<ContractTransaction> => {
      if (!isAsyncTaskDataAvailable(connectedProvider)) {
        throw new Error("Connected provider is not available");
      }
      if (env === undefined) {
        throw new Error("Env is not available");
      }

      const { provider, account, chainId } = connectedProvider.data;
      const contract = Bridge__factory.connect(to.bridgeContractAddress, provider.getSigner());
      const isL2Claim = to.key === "polygon-zkevm";
      const apiUrl = env.bridgeApiUrl;
      const networkId = from.networkId;

      const { merkleProof, mainExitRoot, rollupExitRoot } = await getMerkleProof({
        apiUrl,
        networkId,
        depositCount,
      });

      const isEtherToken = token.address === ethersConstants.AddressZero;
      const isTokenNativeOfToChain = token.chainId === to.chainId;
      const isMetadataRequired = !isEtherToken && !isTokenNativeOfToChain;
      const metadata = isMetadataRequired
        ? await getErc20TokenEncodedMetadata({ token, chain: from })
        : "0x";

      const executeClaim = () =>
        contract
          .claim(
            merkleProof,
            depositCount,
            mainExitRoot,
            rollupExitRoot,
            tokenOriginNetwork,
            token.address,
            to.networkId,
            destinationAddress,
            amount,
            metadata,
            isL2Claim ? { gasLimit: 500000, gasPrice: 0 } : {}
          )
          .then((txData) => {
            storage.addAccountPendingTx(account, env, {
              type: "claim",
              depositTxHash,
              destinationAddress,
              claimTxHash: txData.hash,
              from,
              to,
              timestamp: Date.now(),
              token,
              amount,
            });

            return txData;
          });

      if (to.chainId === chainId) {
        return executeClaim();
      } else {
        return changeNetwork(to)
          .catch(() => {
            throw "wrong-network";
          })
          .then(executeClaim);
      }
    },
    [connectedProvider, env, changeNetwork]
  );

  const value = useMemo(
    () => ({
      getMaxEtherBridge,
      estimateBridgeGas,
      fetchBridge,
      fetchBridges,
      getPendingBridges,
      bridge,
      claim,
    }),
    [
      getMaxEtherBridge,
      estimateBridgeGas,
      fetchBridge,
      fetchBridges,
      getPendingBridges,
      bridge,
      claim,
    ]
  );

  return <bridgeContext.Provider value={value} {...props} />;
};

const useBridgeContext = (): BridgeContext => {
  return useContext(bridgeContext);
};

export { BridgeProvider, useBridgeContext };
