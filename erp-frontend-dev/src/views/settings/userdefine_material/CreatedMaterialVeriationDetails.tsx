import React, { useEffect, useState } from 'react';
import RitzTable from '@/components/Ritz/RitzTable';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
  Breadcrumbs,
  Card,
  Divider,
  Grid,
  Link,
  IconButton,
  CardHeader,
} from '@mui/material';
import api from '@/services/api';
import NextLink from 'next/link';
import toast from 'react-hot-toast';
import { TabContext } from '@mui/lab';
import { ColumnDef } from '@tanstack/table-core';
import { getDefaultError } from '@/helpers/Utilities';
import DefaultLoader from '@/components/DefaultLoader';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import * as MaterialAdministrationUrls from '@/helpers/constants/rest_urls/MaterialAdministrationUrls';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { useRouter } from 'next/router';
import { RitzTabPanel, RitzTabs } from '@/components/Ritz/RitzTabs';
import { orderSummaryURL } from '@/helpers/constants/FrontEndUrls';
import * as sharedUrls from "@/helpers/constants/rest_urls/SharedUrls";
import { programedOrderInquiriesSummaryUrl } from '@/helpers/constants/front_end/CostingUrls';

const CreatedMaterialVeriationDetails = ({materialId, variationId}: any) => {
  console.log(variationId,"materialId")
  const router = useRouter();
  const [ColumnDefItems, setColumnDefItems] = useState([]);
  const [ColumnDefCreatedCostings, setColumnDefCreatedCostings] = useState([]);
  const [ColumnDefSupplier, setColumnDefSupplier] = useState([]);
  const [activeTab, setActiveTab] = useState('1');
  const [isLoading, setIsLoading] = useState(true);
  const [materials, setMaterials] = useState<any>([]);
  const [materialHeaderData, setMaterial] = useState<any>({});
  const [ItemMaterial, setItemMaterial] = useState<any>([]);
  const [CostingMaterial, setCostingMaterial] = useState<any>([]);
  const [SupplierMaterial, setSupplierMaterial] = useState<any>([]);
  const [MaterialData, setMaterialData] = useState<any>([]);

  const getMaterialData = () => {
      api.get(sharedUrls.customerBrandMaterialDetailURL(+materialId))
      .then(resp => {
        const responseData = resp?.data || {};
        setMaterialData(responseData);
      })
      .catch((error) => {
        if(error.length > 0){
          toast.error(getDefaultError(error?.response?.status));
        }
      })
      .finally(() => setIsLoading(false));
  }

    const getData = () => {
      api.get(MaterialAdministrationUrls.getMaterialDetailURL(+materialId))
      .then(resp => {
        const responseData = resp?.data || {};
        setMaterial(responseData);
      })
      .catch((error) => {
        if(error.length > 0){
          toast.error(getDefaultError(error?.response?.status));
        }
      })
      .finally(() => setIsLoading(false));
  }

    const getItemData = () => {
      api.get(MaterialAdministrationUrls.getItemMaterialListURL(variationId))
      .then(resp => {
        const responseData = resp?.data || {};
        setItemMaterial(responseData);
      })
      .catch((error) => {
        if(error.length > 0){
          toast.error(getDefaultError(error?.response?.status));
        }
      })
      .finally(() => setIsLoading(false));
  }

  const getCostingData = () => {
    api.get(MaterialAdministrationUrls.getCostingMaterialListURL(variationId))
    .then(resp => {
      const responseData = resp?.data || {};
      setCostingMaterial(responseData);
    })
    .catch((error) => {
      if(error.length > 0){
        toast.error(getDefaultError(error?.response?.status));
      }
    })
    .finally(() => setIsLoading(false));
}

const getSupplierData = () => {
  api.get(MaterialAdministrationUrls.getSupplierMaterialListURL(materialId))
  .then(resp => {
    const responseData = resp?.data || {};
    setSupplierMaterial([...responseData]);
  })
  .catch((error) => {
    if(error.length > 0){
      toast.error(getDefaultError(error?.response?.status));
    }
  })
  .finally(() => setIsLoading(false));
}

    const headers = materials[0]?.headers;
    const matchingValues = materials.map((material: any) => {
      const attributes = material.attributes;
      const matchingAttributes = {};
    
      for (const header of headers) {
        const fieldName = header.name;
        if (attributes[fieldName] !== undefined) {
          matchingAttributes[fieldName] = attributes[fieldName];
        }
      }
      const matchingAttributeValues = Object.values(matchingAttributes);
      return matchingAttributeValues;
    });

    const onChangeTab = (event: string) => {
       //setActiveTab(event);
      const url = {
          pathname: router.pathname,
          query: {...router.query, tab: event}
      }
      router.replace(url, undefined, { shallow: true });
      setIsLoading(true);
      // fetchData(event);
  }
    
  const renderSubRow = ({ row }: any) => {
    const subRows = row?.original?.supplierinquirymaterialcode_set || [];
    return (
      <>
        <Table
          size="small"
          sx={{
            borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
            '& .MuiTableCell-head': {
              color: (theme) => theme.palette.grey[700],
              background: (theme) => theme.palette.grey[50],
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Supplier</TableCell>
              <TableCell>Supplier Reference Code</TableCell>
              <TableCell>Brand</TableCell>
              <TableCell>Material Code</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subRows.length > 0 ? (
              subRows.map((supplier: any, i: number) => (
                <TableRow
                  key={i}
                  sx={{
                    '&:last-child td, &:last-child th': {
                      border: 0,
                    },
                    marginTop: '10px',
                    marginBottom: '10px'  
                  }}
                >
                  <TableCell>{supplier.supplier_name ?? "--"}</TableCell>
                  <TableCell>{supplier.supplier_material_reference_code ?? "--"}</TableCell>
                  <TableCell>{supplier.brand_name ?? "--"}</TableCell>
                  <TableCell>{supplier.customer_brand_material_code ?? "--"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} sx={{textAlign: 'center', marginTop: '5px', marginBottom: '5px'}}>
                  <span>There is nothing to show on supplier details.</span>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </>
    );
  };

    const seItemColumns = () => {
      let cols: ColumnDef<any>[] = [
        {
          accessorKey: "reference_code",
          header: '',
          cell: ({ row, getValue }) => (
            <span style={{ paddingLeft: `${row.depth * 2}rem` }}>
              
            </span>
          ),
          enableSorting: false,
          enableColumnFilter: false,
          enableGlobalFilter: false,
          meta: {
            align: "left",
            width: 95,
          },
        },
        {
          accessorKey: "name",
          header: "Item",
        },
        {
          accessorKey: "customer_brand_name",
          header: "Customer and Brand",
        },
        {
          accessorKey: "code",
          header: "Code",
        },
        {
          accessorKey: "active",
          header: "Status",
        }

      ];
  
      setColumnDefItems(cols);
    };

    const setCostingColumns = () => {
      let cols: ColumnDef<any>[] = [
        {
          accessorKey: "reference_code",
          header: '',
          cell: ({ row, getValue }) => (
            <span style={{ paddingLeft: `${row.depth * 2}rem` }}>
            </span>
          ),
          enableSorting: false,
          enableColumnFilter: false,
          enableGlobalFilter: false,
          meta: {
            align: "left",
            width: 95,
          },
        },
        {
          accessorKey: "id",
          header: "Order",
          cell: props => (
            <Link target = 'blank' component={NextLink} href={orderSummaryURL(props.row.getValue('id'))}>{props?.row?.original?.display_number}</Link>
        )
        },
        {
          accessorKey: "order_program",
          header: "Program",
          cell: props => {
            if (props.row.original.order_program) {
              return (
               <>
               <Link component={NextLink} href={programedOrderInquiriesSummaryUrl(props.row.original.order_program)}>{props?.row?.original?.order_program_display_number}</Link>
               </>
              );
            } else {
              return <Typography>--</Typography>;
            }
          }
        },
        {
          accessorKey: "customer.name",
          header: "Customer",
        },
        {
          accessorKey: "brand.name",
          header: "Brand Name",
        },
        {
          accessorKey: "date",
          header: "Date",
        },
        {
          accessorKey: "year",
          header: "Year",
        },
        {
          accessorKey: "style_number",
          header: "Style Number",
        },
        {
          accessorKey: "ritz_code",
          header: "Ritz Code",
        },
        {
          accessorKey: "state.display_value",
          header: "Status",
        }
       
      ];
  
      setColumnDefCreatedCostings(cols);
    };

    const setSupplierColumns = () => {
      let cols: ColumnDef<any>[] = [
        {
          accessorKey: "supplier_name",
          header: 'Supplier',
          enableSorting: false,
          enableColumnFilter: false,
          enableGlobalFilter: false,
          meta: {
            align: "left",
            width: 95,
          },
        },
        {
          accessorKey: "reference_code",
          header: 'Supplier Reference Code',
          cell: ({ row, getValue }) => (
            <span style={{ paddingLeft: `${row.depth * 2}rem` }}>
              {row.original?.customer_brand_material_details?.reference_code}
            </span>
          ),
          enableSorting: false,
          enableColumnFilter: false,
          enableGlobalFilter: false,
          meta: {
            align: "left",
            width: 95,
          },
        },
      ];
      setColumnDefSupplier(cols);
    }

    useEffect(() => {
      seItemColumns();
      setCostingColumns();
      setSupplierColumns();
    }, []);
    
    useEffect(() => {
      if(materialId){
        getData()
        getItemData()
        getCostingData()
        getSupplierData()
        getMaterialData()
      }
     
    }, [materialId]);

    useEffect(() => {
      // On url param change
      const tab = router?.query?.tab?.toString();
      if (tab) {
          setActiveTab(tab);
      }
  }, [router]);

  return (
    <>
    <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{ mb: 1.5 }}>
        <Link underline='hover' color='inherit' component={NextLink} href={'/admin/material_types/created_materials'}>Created Material List</Link>
        <Link underline='hover' color='inherit' component={NextLink} href={'/admin/material_types/created_materials/' + materialId}>Created Material Details</Link>
        <Typography color='text.primary'> Created Material Variation Details</Typography>
      </Breadcrumbs>
      <Typography variant='h1'> {matchingValues.length > 0 && matchingValues[0] !== undefined && matchingValues[0][0]}</Typography>
       <>

    <Typography variant='h1'>{materialHeaderData?.material}</Typography>

    <Card variant='outlined' sx={{ mb: 2 }}>
      <Grid container columnSpacing={2} px={2}>
        <Grid item sm={2} xs={2}>
          <dl>
            <dt>Material</dt>
            <dd>{materialHeaderData?.material || '--'}</dd>
          </dl>
        </Grid>
        <Divider orientation='vertical' variant='middle' flexItem />
        <Grid item sm={2} xs={2}>
          <dl>
            <dt style={{ marginTop: 5 }}>Category Type</dt>
            <dd>{materialHeaderData?.category|| '--'}</dd>
          </dl>
        </Grid>
        <Divider orientation='vertical' variant='middle' flexItem />
        <Grid item sm={2} xs={2}>
          <dl>
            <dt>Composition</dt>
            <dd>{MaterialData?.material_data?.fabric_composition_display_value|| '--'}</dd>
          </dl>
        </Grid>
        <Divider orientation='vertical' variant='middle' flexItem />
        <Grid item sm={2} xs={2}>
          <dl>
            <dt>Description</dt>
            <dd>{MaterialData?.material_data?.fabric_texture_description_display_value|| '--'}</dd>
          </dl>
        </Grid>
        <Divider orientation='vertical' variant='middle' flexItem />
        <Grid item sm={2} xs={2}>
          <dl>
            <dt>GSM</dt>
            <dd>{MaterialData?.material_data?.fabric_gsm|| '--'}</dd>
          </dl>
        </Grid>
        <Divider orientation='vertical' variant='middle' flexItem />
        <Grid item sm={2} xs={2}>
          <dl>
            <dt>Color</dt>
            <dd>{MaterialData?.material_data?.fabric_color|| '--'}</dd>
          </dl>
        </Grid>
        <Divider orientation='vertical' variant='middle' flexItem />
        <Grid item sm={2} xs={2}>
          <dl>
            <dt>Fabric Type</dt>
            <dd>{MaterialData?.material_data?.fabric_type_display_value|| '--'}</dd>
          </dl>
        </Grid>
      </Grid>
    </Card>
    <TabContext value={activeTab}>
    <RitzTabs tabs={['Items', 'Created Costings', 'Supplier Details' ]} activeTab={activeTab} emitChange={onChangeTab}/>
    <RitzTabPanel value='1' sx={{ pt: 2 }}>
     <RitzTable
          columns={ColumnDefItems}
          data={ItemMaterial}
        /> 
     </RitzTabPanel>
    <RitzTabPanel value='2' sx={{ pt: 2 }}>
     <RitzTable
          columns={ColumnDefCreatedCostings}
          data={CostingMaterial}
        /> 
    </RitzTabPanel>
    <RitzTabPanel value='3' sx={{ pt: 2 }}>
     <RitzTable
          columns={ColumnDefSupplier}
          data={SupplierMaterial}
        /> 
    </RitzTabPanel>
     </TabContext>
    </>
      </>
  );
};

export default CreatedMaterialVeriationDetails;
