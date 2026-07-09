import { useEffect, useState } from "react";
import { Box, Link, Typography } from '@mui/material';
import * as RestUrls from '@/helpers/constants/rest_urls/MaterialAdministrationUrls';
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import NextLink from 'next/link';
import DefaultLoader from "@/components/DefaultLoader";
import api from "@/services/api";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { createdMaterialDetailsListURL } from "@/helpers/constants/front_end/AdminUrls";
import { createOrderMaterials } from "@/helpers/constants/RestUrls";
import React from "react";
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CustomerBrandMaterialDetail from "../settings/userdefine_material/MaterialDetail";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import { supplierDetailsURL } from "@/helpers/constants/FrontEndUrls";

const CreatedOrderMaterials = ({ versionId }: any) => {
  const keyHelper = new ReactKeyHelper();
  const [isLoading, setIsLoading] = useState(true);
  const [materialData, setMaterialData] = useState<any>([]);
  const [isOpenMaterialDetailModal, setIsOpenMaterialDetailModal] = useState<any>({});

  const getData = () => {
    setIsLoading(true);
    api.get(createOrderMaterials(versionId)).then(resp => {
      const resdata = resp?.data || [];
      setMaterialData([...resdata]);
    }).catch((error) => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const handleReferenceCodeDetailOnClick = (openState: boolean, materialId: any) => {
    setIsOpenMaterialDetailModal({ modalStatus: openState, materialId: materialId });
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'attributes.material_label',
      header: 'Material',
    },
    {
      accessorKey: "attributes.reference_code",
      header: 'Material Reference Code',
    },
    {
      accessorKey: "attributes.ritz_customer_brand_reference_code",
      header: 'Ritz Reference Code', 
      cell: props => (
        <>
          <Box sx={{ display: "flex", alignItems: "center" }}>
          {props.row?.original.attributes.ritz_customer_brand_reference_code}
            <OpenInNewIcon
                sx={{position: 'relative', top: '0px', ml: 2, color: 'rgb(25, 118, 210)',  cursor: 'pointer'}}
                onClick={() => handleReferenceCodeDetailOnClick(true, props.row?.original.attributes.customer_brand_material_id)} />
          </Box>
        </>
      ),

    },
    {
      accessorKey: "supplier_material_reference_code",
      header: 'Supplier Material Reference Code',
    },
    {
      accessorKey: "attributes.material_supplier",
      header: 'Supplier',
      cell: props => (
        <Link component={NextLink} href={supplierDetailsURL(props.row?.original?.supplier) || '#'} >{props.row?.original?.attributes?.material_supplier}</Link>
    )
    },
    {
      accessorKey: "supplier_inquiry_data.price",
      header: 'Costing Unit Price',
      cell: props => (
        <>
           {props.row?.original.supplier_inquiry_data.cost_per_unit} {props.row?.original.supplier_inquiry_data.costing_unit}
        </>
      ),
    },
    {
      accessorKey: "supplier_inquiry_data.expiration_date",
      header: 'Expiration date',
    },
    
  ];

  useEffect(() => {
    getData();
  }, []);

  return (
    <>
      {isOpenMaterialDetailModal.modalStatus &&
        <CustomerBrandMaterialDetail
          customerBrandMaterialReferenceCodeId={isOpenMaterialDetailModal?.materialId}
          modalOpen={isOpenMaterialDetailModal.modalStatus}
          setModalOpen={() => { setIsOpenMaterialDetailModal({ modalStatus: false, materialId: null }) }}
        />
      }
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          {
            materialData?.map((materialCategory: any, materialCategoryIndex: any) => (
              <React.Fragment key={`${keyHelper.getNextKeyValue()}`}>
                <Box sx={{ mt: 3 }}>
                  <Typography variant='h1' color='primary' sx={{ fontWeight: 'bold' }}>{materialCategory?.display_value}</Typography>
                </Box>
                <Box>
                  <RitzTable
                    data={materialCategory?.data}
                    columns={columns}
                    pagination={false}
                    enableGlobalFilter={false}
                    columnFilterMode={false}
                  />
                </Box>
              </React.Fragment>
            ))
          }
        </>
      )}

    </>
  );
}

export default CreatedOrderMaterials