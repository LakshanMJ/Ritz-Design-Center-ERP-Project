import DocumentHead from '@/components/DocumentHead';
import EmbellishmentListView from '@/views/settings/embellishment/EmbellishmentListView';

const item = () => {
    return (
        <>
            <DocumentHead title='Embellishment' />
            <EmbellishmentListView />
        </>
    );
};

export default item;