import ProductionPlanner from "./components/ProductionPlanner";

const Planner = () => {
  return (
    <div className="flex gap-3 h-inherit">
      <div className="w-30">Orders</div>
      <ProductionPlanner orders={[]} />
    </div>
  );
}

export default Planner;