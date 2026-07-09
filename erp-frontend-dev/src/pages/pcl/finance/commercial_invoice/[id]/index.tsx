import DocumentHead from "@/components/DocumentHead";
import CommercialInvoiceSummary from "@/views/commercial_invoice/CommercialInvoiceSummary";
import { useRouter } from "next/router";
import React, {useState} from "react";

const commercialInvoiceSummary = () => {
    const router = useRouter();
    const { id } = router.query;
    const title = 'Commercial Invoice';

    return (
        <>
            <DocumentHead title={title} />
            <CommercialInvoiceSummary commercialInvoiceId={id}/>
        </>
    );
}

export default commercialInvoiceSummary;
