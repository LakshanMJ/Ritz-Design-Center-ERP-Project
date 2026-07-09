import DefaultLoader from "@/components/DefaultLoader";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzTable from "@/components/Ritz/RitzTable";
import { RitzTabPanel, RitzTabs } from "@/components/Ritz/RitzTabs";
import api from "@/services/api";
import { TabContext } from "@mui/lab";
import { Box, Button, Card, Divider, Grid, Link,Typography } from "@mui/material";
import { ColumnDef } from "@tanstack/react-table";
import router from "next/router";
import { useEffect, useState } from "react";
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { purchaseOrderClubDetailsPageURL } from "@/helpers/constants/front_end/POUrls";

const ServicePODetails = ({ servicePoId }: any) => {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [servicePO, setServicePO] = useState<any>([]);
  const [servicePOEdit, setServicePOEdit] = useState<any>({});
  const [servicePOMetaData, setServicePOMetaData] = useState<any>({});

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);
  const [activeTab, setActiveTab] = useState('1');
  const servicePoTabKey = 'servicePoTab';
  const tabLabel = 'tabLabel';
  const tabDisplayOrderKey = 'tabDisplayOrder';

  const servicePODetailsTabs = {
    [servicePoTabKey]: { [tabDisplayOrderKey]: '1', [tabLabel]: 'Service POs' },
  };

  const initialTabs = [
    servicePODetailsTabs[servicePoTabKey][tabLabel],
  ];

  const [summaryTabs, setSummaryTabs] = useState([...initialTabs]);

  const tableCols: ColumnDef<any>[] = [
      {
          accessorKey: 'service_description',
          header: 'Service Description',
          cell: (props) => {
            return <Typography>{props?.row?.original?.service_description || '--'}</Typography>
          }
      },
      {
          accessorKey: 'service_category',
          header: 'Service Category',
          cell: (props) => {
            return <Typography>{props?.row?.original?.service_category || '--'}</Typography>
          }
      },
      {
          accessorKey: 'req_date',
          header: 'Requested Date',
          cell: (props) => {
            return <Typography>{props?.row?.original?.req_date || '--'}</Typography>
          }
      },
      {
        accessorKey: 'quanity',
        header: 'Quantity',
        cell: (props) => {
          const quantity = props?.row?.original?.quantity;
          const unit = props?.row?.original?.quantity_units || '';
          return <Typography>{quantity ? `${quantity} ${unit}` : '--'}</Typography>
        }
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: (props) => {
          const price = props?.row?.original?.price;
          const unit = props?.row?.original?.price_units || '';
          return <Typography>{price ? `${price} ${unit}` : '--'}</Typography>
        }
      },
      {
          accessorKey: 'value',
          header: 'Value',
          cell: (props) => {
            const price = props?.row?.original?.quantity_price;
            const unit = props?.row?.original?.price_units || '';
            return <Typography>{price ? `${price} ${unit}` : '--'}</Typography>
          }
      }
  ]

  const getServicePoMetaData = () => {
    setIsLoading(true);
    api.get(GrnUrls.servicePoMetaDataURL()).then(resp => {
      const resdata = resp?.data || {};
      setServicePOMetaData({...resdata});
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const getPayload = () => {
    const details = servicePOEdit

    if (!details) return {};

    return {
      supplier_po_number: details.supplier_po_number,
      delivery_mode: details.delivery_mode,
      payment_term: details.payment_term,
      terms_of_delivery: details.terms_of_delivery,
      value_added_tax_registration_number: details.value_added_tax_registration_number,
      simplified_value_added_tax_registration_number: details.simplified_value_added_tax_registration_number,
      board_of_investment_registration_number: details.board_of_investment_registration_number,
      state: details.state
    };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const parsedValue = type === 'number' ? Number(value) : value;

    setServicePOEdit((prev: any) => ({
        ...prev,
        [name]: parsedValue,
    }));
  };

  const formFields: any[] = [
    { label: 'Service PO No', name: 'name', value: servicePOEdit?.service_po_number || '', type: 'text', isDisabled: true },
    { label: 'Payment Term', name: 'payment_term', value: servicePOEdit?.payment_term || '', type: 'select', optionText: 'display', optionValue: 'unit', options: servicePOMetaData?.payment_method_types, onChange: handleChange },
    { label: 'VAT Reg No', name: 'value_added_tax_registration_number', value: servicePOEdit?.value_added_tax_registration_number || '', type: 'text', onChange: handleChange },
    { label: 'SVAT Reg No', name: 'simplified_value_added_tax_registration_number', value: servicePOEdit?.simplified_value_added_tax_registration_number || '', type: 'text', onChange: handleChange },
    { label: 'BOI Reg No', name: 'board_of_investment_registration_number', value: servicePOEdit?.board_of_investment_registration_number || '', type: 'text', onChange: handleChange },
  ]

  const getServicePoDetails = () => {
      setIsLoading(true);
      api.get(GrnUrls.servicePoDetails(servicePoId)).then(resp => {
        const resdata = resp?.data || {};
        setServicePO({...resdata});
        setServicePOEdit({...resdata});
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsLoading(false));
  };

  const handleDownload = async () => {
      if (servicePO?.service_po_file_path
        && servicePO.service_po_file
      ) {
        try {
          const response = await fetch(servicePO?.service_po_file_path);
            if (!response.ok) {
              throw new Error('This file can not be found');
            }
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
      
              const link = document.createElement('a');
              link.href = url;
              link.download = servicePO?.service_po_file_path;
              link.click();
      
              URL.revokeObjectURL(url);
            } catch (error) {
              toast.error('This file can not be found');
            }
            } else {
              //
        }
  };

  const handleSave = () => {
          setIsSaving(true);
          const payload = getPayload();
          const request = {
              method: 'put',
              url: GrnUrls.servicePoUpdate(servicePoId),
              data: payload
          }
  
          api(request).then(() => {
              setIsModalOpen(false); 
              getServicePoDetails();
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
    if (servicePoId != null && servicePoId > 0) {
      getServicePoDetails();
    }
  }, [servicePoId]);

  useEffect(() => {
    getServicePoMetaData();
  }, []);    

return(

    <Box sx={{ width: '100%', padding: '10px', borderRadius: '8px', marginLeft: '0px' }}>
        <>
          

          <RitzModal
            open={isModalOpen}
            onClose={handleCloseModal}
            title="Edit Service PO Details"
            maxWidth='sm'
          >
            <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={servicePoId} errors={errors} isSaving={isSaving} />
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
                  <dt>Service PO</dt>
                  <dd>
                    <Typography>{servicePO?.service_po_number || '--'}</Typography>
                  </dd>
                </dl>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box flex={1} sx={{ml: 2}}>
                <dl>
                  <dt>Supplier</dt>
                  <dd>
                    <Typography>{servicePO?.supplier_details?.supplier_name || '--'}</Typography>
                  </dd>
                </dl>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box flex={1} sx={{ml: 2}}>
                <dl>
                  <dt>Style & Season</dt>
                  <dd>
                    <Typography>{servicePO?.style || '--'}</Typography>
                  </dd>
                </dl>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box flex={1} sx={{ml: 2}}>
                <dl>
                  <dt>Club No</dt>
                  <dd>
                    <Typography>
                      <Link href={purchaseOrderClubDetailsPageURL(servicePO?.po_club_id)} target="_blank">
                        {servicePO?.po_club_number || '--'}
                      </Link>
                    </Typography>
                  </dd>
                </dl>
              </Box>
            </Box>

            <Box display="flex" alignItems="center" sx={{ mt: 2 }}>
              <Box flex={1}>
                <dl>
                  <dt>Date</dt>
                  <dd>
                    <Typography>{servicePO?.updated ? servicePO.updated.slice(0, 10) : '--'}</Typography>
                  </dd>
                </dl>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box flex={1} sx={{ml: 2}}>
                <dl>
                  <dt>Payment Term</dt>
                  <dd>
                    <Typography>{servicePO?.payment_term_display|| '--'}</Typography>
                  </dd>
                </dl>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box flex={1} sx={{ml: 2}}>
                <dl>
                  <dt>State</dt>
                  <dd>
                    <Typography>{servicePO?.state_display || '--'}</Typography>
                  </dd>
                </dl>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box flex={1} sx={{ml: 2}}>
                <dl>
                  <dt>VAT Reg No</dt>
                  <dd>
                    <Typography>{servicePO?.value_added_tax_registration_number || '--'}</Typography>
                  </dd>
                </dl>
              </Box>
            </Box>
            
            <Box display="flex" alignItems="center" sx={{ mt: 2 }}>
              <Box flex={1}>
                <dl>
                  <dt>SVAT Reg No</dt>
                  <dd>
                    <Typography>{servicePO?.simplified_value_added_tax_registration_number || '--'}</Typography>
                  </dd>
                </dl>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box flex={1} sx={{ml: 2}}>
                <dl>
                  <dt>BOI Reg No</dt>
                  <dd>
                    <Typography>{servicePO?.board_of_investment_registration_number || '--'}</Typography>
                  </dd>
                </dl>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box flex={1} sx={{ml: 2}}>
                <dt>Service PO File</dt>
                <dd>
                  <Box component="span">
                    <Button onClick={handleDownload} sx={{ paddingLeft: '0%', paddingTop: '0%', ':hover': { backgroundColor: 'transparent' } }}>
                    <Typography>{servicePO?.service_po_file || '--'}</Typography></Button>
                  </Box>
                </dd>
              </Box>
              <Box flex={1} sx={{ml: 2}}>
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
              <RitzTabPanel value={`${servicePODetailsTabs[servicePoTabKey][tabDisplayOrderKey]}`}>
                  <RitzTable
                    columns={tableCols}
                    data={servicePO?.service_po_service_details || []}
                  />
              </RitzTabPanel>
            </Box>
          </TabContext>
          </>
          )}

          
        </>
    </Box>
)};

export default ServicePODetails;