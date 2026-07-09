import DocumentHead from '@/components/DocumentHead';
import PlacementListView from '@/views/settings/placement/PlacementListView';

const IndexPage = () => {
    return (
        <>
            <DocumentHead title='Placements' />
            <PlacementListView />
        </>
    );
};

export default IndexPage;