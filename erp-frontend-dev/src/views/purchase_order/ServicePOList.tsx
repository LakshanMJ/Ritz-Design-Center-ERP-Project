import RitzTable from "@/components/Ritz/RitzTable";
import { servicePoDetailsPageURL } from "@/helpers/constants/FrontEndUrls";
import { getDefaultError } from "@/helpers/Utilities";
import api from "@/services/api";
import { Box, Link, Typography } from "@mui/material";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import DefaultLoader from "@/components/DefaultLoader";

const ServicePO = () => {

    const [isLoading, setIsLoading] = useState(true);
    const [servicePOs, setServicePOs] = useState<any>([]);

    const tableCols: ColumnDef<any>[] = [
            {
                accessorKey: 'service_po_number',
                header: 'Service PO No',
                cell: (props) => {
                    return <Link href={servicePoDetailsPageURL(props?.row?.original?.id)}>{props?.row?.original?.service_po_number || '--'}</Link>;
                }
            },
            {
                accessorKey: 'supplier_name',
                header: 'Supplier',
                cell: (props) => {
                    return <Typography>{props?.row?.original?.supplier_details?.supplier_name || '--'}</Typography>
                }
            },
            {
                accessorKey: 'payment_term',
                header: 'Payment Term',
                cell: (props) => {
                    return <Typography>{props?.row?.original?.payment_term_display || '--'}</Typography>
                }
            },
            {
                accessorKey: 'value_added_tax_registration_number',
                header: 'VAT Reg No',
                cell: (props) => {
                    return <Typography>{props?.row?.original?.value_added_tax_registration_number || '--'}</Typography>
                }
            },
            {
                accessorKey: 'simplified_value_added_tax_registration_number',
                header: 'SVAT Reg No',
                cell: (props) => {
                    return <Typography>{props?.row?.original?.simplified_value_added_tax_registration_number || '--'}</Typography>
                }
            },
            {
                accessorKey: 'board_of_investment_registration_number',
                header: 'BOI Reg No',
                cell: (props) => {
                    return <Typography>{props?.row?.original?.board_of_investment_registration_number || '--'}</Typography>
                }
            }
        ]

    const getServicePOs = () => {
        setIsLoading(true);
        api.get(GrnUrls.servicePoListURL()).then(resp => {
          const resdata = resp?.data || [];
          setServicePOs([...resdata]);
        }).catch(error => {
          toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    useEffect(() => {
        getServicePOs();
    }, []);

return(
    <>
        <Typography variant='h1'>Service POs</Typography>
        {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                <DefaultLoader />
            </Box>
            ) : (
            <Box>
                <RitzTable
                    data={servicePOs}
                    columns={tableCols}
                />
            </Box>
        )} 
    </>
)}
export default ServicePO;