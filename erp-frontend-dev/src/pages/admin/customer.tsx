import DocumentHead from "@/components/DocumentHead";
import CustomerListPage from "@/views/settings/customer/CustomerListView";

const customer = () => {
    return (
        <>
            <DocumentHead title='Customers' />
            <CustomerListPage />
        </>
    );
}

export default customer;