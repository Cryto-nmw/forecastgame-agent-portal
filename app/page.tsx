import ConnectWalletButton from "@/components/ConnectWalletButton";
import CreateGameForm from "@/components/CreateGameForm";
import { getFactoryDetails } from "@/actions";

export default async function Home() {
  const factoryDetails = await getFactoryDetails();

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-4xl font-bold text-center my-8">Agent Portal</h1>

      <div className="flex justify-between items-start mb-8">
        <div className="text-lg">
          <p>
            Connected Chain:{" "}
            <span className="font-semibold">
              {process.env.NEXT_PUBLIC_CHAIN_NAME || "Loading..."} (
              {process.env.NEXT_PUBLIC_CHAIN_ID || "..."})
            </span>
          </p>
          <p>
            ForecastGameFactory Address:{" "}
            <span className="font-semibold">
              {process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "Not set"}
            </span>
          </p>
          {factoryDetails && (
            <p>
              Factory Deployed At (DB):{" "}
              <span className="font-semibold">
                {new Date(factoryDetails.deployed_at).toLocaleString()}
              </span>
            </p>
          )}
          <p>
            Agent ID:{" "}
            <span className="font-semibold">
              {process.env.NEXT_PUBLIC_AGENT_ID || "Not set"}
            </span>
          </p>
        </div>
        <ConnectWalletButton />
      </div>

      <h2 className="text-2xl font-bold mb-4">Create New Game</h2>
      {factoryDetails ? (
        <CreateGameForm factoryAbi={factoryDetails.abi} />
      ) : (
        <p className="text-red-500">
          Error: ForecastGameFactory details not found in database. Ensure the
          factory is deployed and its details are logged correctly.
        </p>
      )}
    </main>
  );
}
