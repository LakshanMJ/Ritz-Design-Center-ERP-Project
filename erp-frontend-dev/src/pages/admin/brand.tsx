import DocumentHead from "@/components/DocumentHead";
import BrandListPage from "@/views/settings/brand/BrandListView";

const brand = () => {
    return (
        <>
            <DocumentHead title='Brands' />
            <BrandListPage />
        </>
    );
}

export default brand;