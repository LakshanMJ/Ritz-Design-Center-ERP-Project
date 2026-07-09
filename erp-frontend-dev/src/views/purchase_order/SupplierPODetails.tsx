import DefaultLoader from "@/components/DefaultLoader";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import RitzModal from "@/components/Ritz/RitzModal";
import { RitzTabPanel, RitzTabs } from "@/components/Ritz/RitzTabs";
import { getDefaultError } from "@/helpers/Utilities";
import api from "@/services/api";
import { TabContext } from "@mui/lab";
import { Box, Button, Card, Divider, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography, useTheme } from "@mui/material";
import router from "next/router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import RitzTooltip from "@/components/Ritz/RitzTooltip";
import { purchaseOrderDetailPageURL } from "@/helpers/constants/FrontEndUrls";

const SupplierPODetails = ({supplierPoId} : any) => {

  const theme = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [supplierPO, setSupplierPO] = useState<any>({});
  const [supplierPOEdit, setSupplierPOEdit] = useState<any>({});
  const [supplierPOMetaData, setSupplierPOMetaData] = useState<any>({});
  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);
  const [activeTab, setActiveTab] = useState('1');

  const customerPoTabKey = 'customerPoTab';
  const tabLabel = 'tabLabel';
  const tabDisplayOrderKey = 'tabDisplayOrder';

  const supplierPODetailsTabs = {[customerPoTabKey]: { [tabDisplayOrderKey]: '1', [tabLabel]: 'Customer POs' },};
  const initialTabs = [supplierPODetailsTabs[customerPoTabKey][tabLabel],];
  const [summaryTabs, setSummaryTabs] = useState([...initialTabs]);

  const getPayload = () => {
    const details = supplierPOEdit;
    if (!details) return {};
    return {
      supplier_po_number: details?.supplier_po_number,
      delivery_mode: details?.delivery_mode,
      payment_term: details?.payment_term,
      terms_of_delivery: details?.terms_of_delivery,
      value_added_tax_registration_number: details?.value_added_tax_registration_number,
      simplified_value_added_tax_registration_number: details?.simplified_value_added_tax_registration_number,
      board_of_investment_registration_number: details?.board_of_investment_registration_number,
      state: details?.state
    };
  };

  const handleDownloadSupplierPoFile = async () => {
    if (supplierPO?.supplier_po_file_path && supplierPO?.supplier_po_file) {
      try {
        const response = await fetch(supplierPO?.supplier_po_file_path);
          if (!response.ok) {
            throw new Error('This file can not be found');
          }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
    
            const link = document.createElement('a');
            link.href = url;
            link.download = supplierPO?.supplier_po_file_path;
            link.click();
    
            URL.revokeObjectURL(url);
          } catch (error) {
            toast.error('This file can not be found');
          }
          } else {
            //
      }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const parsedValue = type === 'number' ? Number(value) : value;
    setSupplierPOEdit((prev: any) => ({
        ...prev,
        [name]: parsedValue
    }));
  };

  const formFields: any[] = [
    { label: 'Supplier PO No', name: 'name', value: supplierPOEdit?.supplier_po_number || '', type: 'text', isDisabled: true },
    { label: 'Delivery Mode', name: 'delivery_mode', value: supplierPOEdit?.delivery_mode || '', type: 'select', optionText: 'display', optionValue: 'unit', options: supplierPOMetaData?.delivery_mode_types, onChange: handleChange },
    { label: 'Payment Term', name: 'payment_term', value: supplierPOEdit?.payment_term || '', type: 'select', optionText: 'display', optionValue: 'unit', options: supplierPOMetaData?.payment_method_types, onChange: handleChange },
    { label: 'Terms Of Delivery', name: 'terms_of_delivery', value: supplierPOEdit?.terms_of_delivery || '', type: 'select', optionText: 'display', optionValue: 'unit', options: supplierPOMetaData?.costing_mode_types, onChange: handleChange },
    { label: 'VAT Reg No', name: 'value_added_tax_registration_number', value: supplierPOEdit?.value_added_tax_registration_number || '', type: 'text',  onChange: handleChange  },
    { label: 'SVAT Reg No', name: 'simplified_value_added_tax_registration_number', value: supplierPOEdit?.simplified_value_added_tax_registration_number || '', type: 'text',  onChange: handleChange  },
    { label: 'BOI Reg No', name: 'board_of_investment_registration_number', value: supplierPOEdit?.board_of_investment_registration_number || '', type: 'text',  onChange: handleChange  },
  ]

  const getSupplierPoDetails = () => {
    setIsLoading(true);
    api.get(GrnUrls.supplierPoDetails(supplierPoId)).then(resp => {
      const resdata = resp?.data || {};
      setSupplierPO({...resdata});
      setSupplierPOEdit({...resdata});
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const getSupplierPoMetaData = () => {
    setIsLoading(true);
    api.get(GrnUrls.servicePoMetaDataURL()).then(resp => {
      const resdata = resp?.data || {};
      setSupplierPOMetaData({...resdata});
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };
  
  const handleSave = () => {
    setIsSaving(true);
    const payload = getPayload();
    const request = {
        method: 'put',
        url: GrnUrls.supplierPoUpdate(supplierPoId),
        data: payload
    }
    api(request).then(() => {
        setIsModalOpen(false); 
        getSupplierPoDetails();
    }).catch(error => {
    toast.error(getDefaultError(error?.response?.status));
        if (error?.response?.data) {
            setErrors(error.response.data);
        }
    }).finally(() => setIsSaving(false));
  };

  const handleChangeTabs = (event: string) => {
    const url = {
      pathname: router.pathname,
      query: { ...router.query, tab: event }
    };
    router.replace(url, undefined, { shallow: true });
  };

  useEffect(() => {
    if (supplierPoId != null && supplierPoId > 0) {
      getSupplierPoDetails();
    }
  }, [supplierPoId]);

  useEffect(() => {
    getSupplierPoMetaData();
  }, []);

return(

    <Box sx={{ width: '100%', padding: '0px', borderRadius: '8px', marginLeft: '0px' }}>
        <>
          <RitzModal
            open={isModalOpen}
            onClose={handleCloseModal}
            title="Edit Supplier PO Details"
            maxWidth='sm'
          >
            <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={supplierPoId} errors={errors} isSaving={isSaving} />
          </RitzModal>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <DefaultLoader />
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'flex-flex-start', gap: 2, mt: 2, mb: 2 }}>
                <Button variant="contained" color="primary" onClick={handleOpenModal}>
                  Edit
                </Button>
              </Box>
              <Card variant='outlined' sx={{ mb: 4, p: 3 }}>
                  <Box display="flex" alignItems="center">
                    <Box flex={1}>
                      <dl>
                        <dt>Supplier PO</dt>
                        <dd>
                          <Typography>{supplierPO?.supplier_po_number || '--'}</Typography>
                        </dd>
                      </dl>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box flex={1} sx={{ml: 2}}>
                      <dl>
                        <dt>Delivery Mode</dt>
                        <dd>
                          <Typography>{supplierPO?.delivery_mode_display || '--'}</Typography>
                        </dd>
                      </dl>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box flex={1} sx={{ml: 2}}>
                      <dl>
                        <dt>Payment Term</dt>
                        <dd>
                          <Typography>{supplierPO?.payment_term_display|| '--'}</Typography>
                        </dd>
                      </dl>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box flex={1} sx={{ml: 2}}>
                      <dl>
                        <dt>Terms Of Delivery</dt>
                        <dd>
                          <Typography>{supplierPO?.terms_of_delivery_display || '--'}</Typography>
                        </dd>
                      </dl>
                    </Box>
                  </Box>

                  <Box display="flex" alignItems="center"  sx={{ mt: 2 }}>
                    <Box flex={1}>
                      <dl>
                        <dt>VAT Reg No</dt>
                        <dd>
                          <Typography>{supplierPO?.value_added_tax_registration_number || '--'}</Typography>
                        </dd>
                      </dl>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box flex={1} sx={{ml: 2}}>
                      <dl>
                        <dt>SVAT Reg No</dt>
                        <dd>
                          <Typography>{supplierPO?.simplified_value_added_tax_registration_number || '--'}</Typography>
                        </dd>
                      </dl>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box flex={1} sx={{ml: 2}}>
                      <dl>
                        <dt>BOI Reg No</dt>
                        <dd>
                          <Typography>{supplierPO?.board_of_investment_registration_number || '--'}</Typography>
                        </dd>
                      </dl>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box flex={1} sx={{ml: 2}}>
                      <dl>
                        <dt>State</dt>
                        <dd>
                          <Typography>{supplierPO?.state_display || '--'}</Typography>
                        </dd>
                      </dl>
                    </Box>
                  </Box>

                <Box display="flex" alignItems="center">
                  <Box flex={1}>
                    <dl>
                      <dt>Supplier PO File</dt>
                      <dd>
                        <Box component="span">
                          <Button onClick={handleDownloadSupplierPoFile} sx={{ paddingLeft: '0%', paddingTop: '0%', ':hover': { backgroundColor: 'transparent' } }}>
                          <Typography>{supplierPO?.supplier_po_file || '--'}</Typography></Button>
                        </Box>
                      </dd>
                    </dl>
                    </Box>
                </Box>
              </Card>

              <TabContext value={activeTab}>
                <Box sx={{ marginTop: '20px' }}>
                  <RitzTabs
                    tabs={summaryTabs}
                    activeTab={activeTab}
                    emitChange={(tab: any) => handleChangeTabs(tab)}
                  />
                  <RitzTabPanel value={`${supplierPODetailsTabs[customerPoTabKey][tabDisplayOrderKey]}`}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Material Category</TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Material</TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>PO Number</TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Order Quantity</TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Accepted Delivery Tolerance (%)</TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Unit price</TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Value</TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Total Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {supplierPO?.customer_brand_material_details?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                              No available material details.
                            </TableCell>
                          </TableRow>
                        ) : (
                          supplierPO?.customer_brand_material_details?.map((materialGroup: any, groupIndex: number) =>
                            materialGroup?.material_wise_details?.map((material: any, materialIndex: number) =>
                              material?.po_club_wise_details?.map((poClub: any, clubIndex: number) =>
                                poClub?.po_wise_details?.map((poDetail: any, poIndex: number) => (
                                  <TableRow key={`${groupIndex}-${materialIndex}-${clubIndex}-${poIndex}`}>
                                    {materialIndex === 0 && clubIndex === 0 && poIndex === 0 && (
                                      <TableCell
                                        rowSpan={
                                          materialGroup.material_wise_details.reduce(
                                            (acc: number, mat: any) =>
                                              acc +
                                              mat.po_club_wise_details.reduce(
                                                (acc2: number, club: any) => acc2 + club.po_wise_details.length,
                                                0
                                              ),
                                            0
                                          )
                                        }
                                        sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`,  textAlign: 'center'  }}
                                      >
                                        {materialGroup.category}
                                      </TableCell>
                                    )}

                                    {clubIndex === 0 && poIndex === 0 && (
                                      <TableCell
                                        rowSpan={
                                          material.po_club_wise_details.reduce(
                                            (acc: number, club: any) => acc + club.po_wise_details.length,
                                            0
                                          )
                                        }
                                        sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}
                                      >
                                        {material?.material}
                                        {material?.material_headers && (
                                          <RitzTooltip
                                            materialHeaders={material?.material_headers}
                                            materialDetails={material?.material_attributes}
                                          />
                                        )}
                                      </TableCell>
                                    )}
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center'  }}>
                                      {<Link href={purchaseOrderDetailPageURL(poDetail?.po_id)} sx={{ cursor: 'pointer' }}>{poDetail?.po_number || '--'}</Link>}
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center'  }}>
                                      {poDetail?.total_order_quantity} {poDetail?.total_order_quantity_unit || ''}
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center'  }}>
                                      {poDetail?.accepted_delivery_tolerance || '--'}
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center'  }}>
                                      {poDetail?.unit_price} {poDetail?.price_unit || '--'}
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center'  }}>
                                      {poDetail?.value || ''} {poDetail?.price_unit || '--'}
                                    </TableCell>
                                      {clubIndex === 0 && poIndex === 0 && (
                                        <TableCell
                                          rowSpan={
                                            material.po_club_wise_details.reduce(
                                              (acc:any, club:any) => acc + club.po_wise_details.length,
                                              0
                                            )
                                          }
                                          sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center'  }}
                                        >
                                          {material?.total_value} {material?.price_unit || ''}
                                        </TableCell>
                                      )}
                                  </TableRow>
                                ))
                              )
                            )
                          )
                        )}
                      </TableBody>
                    </Table>  
                  </RitzTabPanel>
                </Box>
              </TabContext>
          </>
          )}
        </>
    </Box>
)};

export default SupplierPODetails;