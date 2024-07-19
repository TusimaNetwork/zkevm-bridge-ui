import { BridgeProvider } from "src/contexts/bridge.context";
import { EnvProvider } from "src/contexts/env.context";
import { ErrorProvider } from "src/contexts/error.context";
import { FormProvider } from "src/contexts/form.context";
import { PriceOracleProvider } from "src/contexts/price-oracle.context";
import { ProvidersProvider } from "src/contexts/providers.context";
import { TokensProvider } from "src/contexts/tokens.context";
import { UIProvider } from "src/contexts/ui.context";
import { useAppStyles } from "src/views/app.styles";
import { Layout } from "src/views/core/layout/layout.view";
import { Router } from "src/views/core/router/router.view";
import { Providers as ReduxProviders } from "../lib/providers"
export const App = (): JSX.Element => {
  useAppStyles();

  return (
    <UIProvider>
      <ErrorProvider>
        <EnvProvider>
          <ReduxProviders>
          <ProvidersProvider>
            <TokensProvider>
              <PriceOracleProvider>
                <BridgeProvider>
                  <FormProvider>
                    <Layout>
                      <Router />
                    </Layout>
                  </FormProvider>
                </BridgeProvider>
              </PriceOracleProvider>
            </TokensProvider>
          </ProvidersProvider>
          </ReduxProviders>
          
        </EnvProvider>
      </ErrorProvider>
    </UIProvider>
  );
};
