import DocumentHead from "@/components/DocumentHead";
import OrderProcessList from "@/views/order_process/OrderProcessList";

const OrderProcesListPage = () => {
    return (
        <>
            <DocumentHead title='Order Process' />
            <OrderProcessList/>
        </>
    );
}

export default OrderProcesListPage;