import { APP_TITLE } from "@/helpers/constants/Constants";
import Head from "next/head";

const DocumentHead = ({ title='' }) => {
    return (
        <Head>
            <title>
                {title && `${title} | `}
                {APP_TITLE}
            </title>
        </Head>
    )
};

export default DocumentHead;