import DocumentHead from '@/components/DocumentHead';
import CADInquiriesList from '@/views/cad/CADInquiriesList';

const cad_list = () => {
    return (
        <>
            <DocumentHead title='CAD Inquiries' />
            <CADInquiriesList />
        </>
    )
}

export default cad_list;