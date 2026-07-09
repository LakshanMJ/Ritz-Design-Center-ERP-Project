import React, {useEffect, useState} from "react";
import {Card, CardHeader, Table, TableBody, TableCell, TableContainer, TableRow} from "@mui/material";
import * as sharedUrls from "@/helpers/constants/rest_urls/SharedUrls";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import toast from "react-hot-toast";
import {getDefaultError} from "@/helpers/Utilities";
import DefaultLoader from "@/components/DefaultLoader";
import RitzModal from "@/components/Ritz/RitzModal";
import { ReactKeyHelper } from "@/helpers/KeyHelper";

const CustomerBrandMaterialDetail = ({ customerBrandMaterialReferenceCodeId, modalOpen, setModalOpen }: any) => {
    const keyHelper = new ReactKeyHelper();
    const materialReferenceCodeKey = 'reference_code';
    const ritzMaterialReferenceCodeKey = 'ritz_customer_brand_reference_code';
    const materialLabelKey = 'material_label';
    const [variationFields, setVariationFields] = useState([]);
    const [materialFields, setMaterialFields] = useState([]);
    const [materialData, setMaterialData] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const staticReferenceCodes = [
        materialReferenceCodeKey,
        ritzMaterialReferenceCodeKey,
    ];

    useEffect(() => {
        fetchMaterialData();
    }, [customerBrandMaterialReferenceCodeId]);

    const fetchMaterialData = () => {
        const materialUrl = sharedUrls.customerBrandMaterialDetailURL(customerBrandMaterialReferenceCodeId);

        api.get(materialUrl).then(resp => {
            const respData = resp?.data || {};

            const materialData = respData?.['material_data'];
            const materialHeaders = respData?.['material_headers'];
            setMaterialData(materialData);
            categorizeFields(materialHeaders);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const categorizeFields = (headers: any) => {

        const variationFields = headers.filter((header: any) => {
            return header['is_variation'];
        });

        const materialFields = headers.filter((header: any) => {
            return !header['is_variation'] && !staticReferenceCodes.includes(header['value']);
        });

        setVariationFields(variationFields);
        setVariationFields(materialFields);
    }

    const getMaterialDetail = () => {
        return (
          isLoading ? <DefaultLoader /> : (
            <Card variant="outlined">
              <CardHeader 
                title={`${materialData?.[materialLabelKey]} Material`} 
                sx={{ backgroundColor: (theme) => theme.palette.grey[50] }} 
              />
              <TableContainer sx={{ maxHeight: 440 }}>
                <Table stickyHeader aria-label="sticky table">
                  <TableBody>
                    <TableRow>
                      <TableCell>Customer Reference Code</TableCell>
                      <TableCell>{materialData?.[materialReferenceCodeKey] || '--'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Ritz Reference Code</TableCell>
                      <TableCell>{materialData?.[ritzMaterialReferenceCodeKey] || '--'}</TableCell>
                    </TableRow>
                    {materialFields.map((header: any) => (
                      <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                        <TableCell>{header?.['label']}</TableCell>
                        <TableCell>{materialData?.[header?.['name']]}</TableCell>
                      </TableRow>
                    ))}
                    {variationFields.map((header: any) => (
                      <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                        <TableCell>{header?.['label']}</TableCell>
                        <TableCell>{materialData?.[header?.['name']]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )
        );
      };

    return (

            <RitzModal open={modalOpen} title={'Material Details'} onClose={() => setModalOpen(false)}>
                {getMaterialDetail()}
            </RitzModal>
    )
}

export default CustomerBrandMaterialDetail;