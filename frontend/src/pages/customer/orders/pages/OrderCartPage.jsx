import CartSection from "../components/CartSection";

export default function OrderCartPage({ guestToken, ...props }) {
	return <CartSection {...props} guestToken={guestToken} />;
}
