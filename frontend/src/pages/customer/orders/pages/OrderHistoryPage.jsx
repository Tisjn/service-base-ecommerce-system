import OrderHistorySection from "../components/OrderHistorySection";

export default function OrderHistoryPage({ products, ...props }) {
	return <OrderHistorySection {...props} products={products} />;
}
