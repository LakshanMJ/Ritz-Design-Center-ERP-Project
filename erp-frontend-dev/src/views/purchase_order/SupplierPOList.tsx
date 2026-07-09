import RitzTable from "@/components/Ritz/RitzTable";
import { Box, Link, Typography } from "@mui/material";
import { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import api from "@/services/api";
import { getDefaultError } from "@/helpers/Utilities";
import { useEffect, useState } from "react";
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import { supplierPODetailsPageURL } from "@/helpers/constants/FrontEndUrls";
import DefaultLoader from "@/components/DefaultLoader";

const SupplierPO = () => {

    const [isLoading, setIsLoading] = useState(true);
    const [supplierPOs, setSupplierPOs] = useState<any>([]);
    
    const tableCols: ColumnDef<any>[] = [
        {
            accessorKey: 'supplier_po_number',
            header: 'Supplier PO No',
            cell: (props) => {
                return <Link href={supplierPODetailsPageURL(props?.row?.original?.id)}>{props?.row?.original?.supplier_po_number || '--'}</Link>;
            }
        },
        {
            accessorKey: 'delivery_mode',
            header: 'Delivery Mode',
            cell: (props) => {
                return <Typography>{props?.row?.original?.delivery_mode_display || '--'}</Typography>
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
            accessorKey: 'terms_of_delivery',
            header: 'Terms Of Delivery',
            cell: (props) => {
                return <Typography>{props?.row?.original?.terms_of_delivery_display || '--'}</Typography>
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
        },
        {
            accessorKey: 'state',
            header: 'State',
            cell: (props) => {
                return <Typography>{props?.row?.original?.state_display || '--'}</Typography>
            }
        }
    ]

    const getSupplierPOs = () => {
        setIsLoading(true);
        api.get(GrnUrls.supplierPoListUrl()).then(resp => {
          const resdata = resp?.data || [];
          setSupplierPOs([...resdata]);
        }).catch(error => {
          toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    useEffect(() => {
        getSupplierPOs();
      }, []);
      
    return (
        <>
            <Typography variant='h1'>Supplier POs</Typography>
            <Box>
                {isLoading ? (
                    <Box textAlign="center" mt={4}>
                        <DefaultLoader/> 
                    </Box>
                ) : (
                    <RitzTable
                    data={supplierPOs}
                    columns={tableCols}
                    />
                )}
            </Box>
        </>

    );
}

export default SupplierPO;