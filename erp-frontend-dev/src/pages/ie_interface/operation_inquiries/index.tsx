import DocumentHead from '@/components/DocumentHead';
import OperationInquiriesList from '@/views/ie_interface/OperationInquiriesList';


const operation_list = () => {
    return (
        <>
            <DocumentHead title='Operation Inquiries' />
            <OperationInquiriesList />
        </>
    )
}

export default operation_list;