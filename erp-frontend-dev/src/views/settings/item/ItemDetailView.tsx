import React, { useEffect } from "react";
import { useState } from "react";
import { useRouter } from "next/router";
import DeleteIcon from '@mui/icons-material/Delete';
import * as RestUrls from '../../../helpers/constants/RestUrls';
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Alert, Breadcrumbs, Card, Divider, Grid, Link, Tab, Tabs } from "@mui/material";
import NextLink from 'next/link';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/services/api";
import EditIcon from '@mui/icons-material/Edit';
import CreatePlacement from "./CreatePlacement";
import DefaultLoader from "@/components/DefaultLoader";
import { TabContext } from "@mui/lab";
import { RitzTabPanel, RitzTabs } from "@/components/Ritz/RitzTabs";
import CreateVariation from "./CreateVariation";
import CreateOperation from "./CreateOperation";
import LaunchIcon from '@mui/icons-material/Launch';
import dayjs from "dayjs";

const ItemDetailView = () => {
  const router = useRouter();
  const [placements, setPlacements] = useState<any>([]);
  const [editPlacementId, setPlacementId] = useState(0);
  const [editOperationId, setOperationId] = useState(0);
  const [editVariationId, setVariationId] = useState(0);
  const [open, setOpen] = useState(false);
  const [openVariaton, setOpenVariation] = useState(false);
  const [openOperation, setOpenOperation] = useState(false);
  const [item, setItem] = useState<any>({});
  const selecteditemId = Number(router.query.id || 0);
  const [title, setTitle] = useState<string>()
  const [isLoading, setIsLoading] = useState(true);
  const [showErrorNotification, setShowErrorNotification] = useState({ status: false, message: "" });
  const [itemErrors, setItemError] = useState<any>({});
  const [itemVariations, setItemVariations] = useState<any>([]);

  const modalOpen = (isOpen: any, title: string, itemId: any) => {
    setTitle(title)
    setPlacementId(itemId);
    setOpen(isOpen);
  };

  const modalOpenVariation = (isOpen: any, title: string, itemId: any, variationId: any) => {
    setTitle(title)
    setVariationId(variationId);
    setOpenVariation(isOpen);
  };

  const getData = () => {
    setIsLoading(true);
    Promise.all([
      api.get(RestUrls.getDetailItemURL(selecteditemId as any)),
      api.get(RestUrls.getItemAttributesURL(selecteditemId as any)),
      api.get(RestUrls.getItemVariationsURL(selecteditemId as any)),
    ]).then(resp => {
      const respData = resp.map((r: any) => r.data);
      const [item, placements, itemVariations] = respData;

      setItem({ ...item });
      setPlacements([...placements]);
      setItemVariations(itemVariations?.variations || []);
    }).catch(error => {
      if (error.response && error.response.status === 404) {
        setShowErrorNotification({ status: true, message: "404 - Something wrong with the URL" })
      } else if (error.response && error.response.status === 500) {
        setShowErrorNotification({ status: true, message: "500 - Internal server error" })
      } else if (error.response && error.response.data) {
        const errorMsg = error.response.data;
        setItemError({ errorMsg });
      } else {
        setShowErrorNotification({ status: true, message: "Oops, something wasn't right" })
      }
    }).finally(() => setIsLoading(false));
  }

  const handleModalClose = (status: any) => {
    setOpen(status)
  };

  const handleModalCloseVariation = (status: any) => {
    setOpenVariation(status)
  };

  const handleModalCloseOperation = (status: any) => {
    setOpenOperation(status)
  };

  const handleGetSavedData = (data: any) => {
    getData();
  };

  const modalOpenOperation = (isOpen: any, title: string, operationId: any, variationId: any) => {
    setTitle(title)
    setOperationId(operationId);
    setVariationId(variationId);
    setOpenOperation(isOpen);
  };

  const getItemVariationOperations = itemVariations.map((variation: any) =>
    variation.operations.filter((operation: any) => operation.variation === variation.id)
  );

  const itemPlacementsColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'placement',
      header: 'Placement',
    },
    {
      accessorKey: 'type',
      header: 'Material Type',
    },
    {
      accessorKey: 'estimated_consumption_ratio',
      header: 'Estimated Consumption Ratio',
    },
    {
      accessorKey: 'estimated_consumption_ratio_units',
      header: 'Estimated Consumption Ratio Units',
    },
    {
      accessorKey: "id",
      header: 'Actions',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: props => (
        <div>
          <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Placement", props.getValue())}>
            <EditIcon fontSize='inherit' />
          </IconButton>
          <IconButton size='small' color='error'>
            <DeleteIcon fontSize='inherit' />
          </IconButton>
        </div>
      ),
      meta: {
        align: 'center',
        width: 100
      }
    }
  ];
  const itemOperationColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'operation_name',
      header: 'Operation',
    },
    {
      accessorKey: "costing_smv",
      header: 'Costed SMV',
    },
    {
      accessorKey: "factory_smv",
      header: 'Factory SMV',
    },
    {
      accessorKey: "video",
      header: 'Attachments',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: props => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {props.row.original.video && <LaunchIcon style={{ marginRight: '10px' }} />}
          {props.row.original.video ? (
            <a
              href={props.row.original.file_details}
              style={{ color: 'blue' }}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => window.open(props.row.original.file_details, '_blank')}
            >
              {props.row.original.display_name}
            </a>
          ) : (
            'No video available'
          )}
        </div>
      ),
      meta: {
        align: 'center',
        width: 200
      }
    },
    {
      accessorKey: "id",
      header: 'Action',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: props => (
        <IconButton size='small' color='primary' onClick={() => modalOpenOperation(true, "Edit Operation", props.getValue(), props.row.original.variation)}>
          <EditIcon fontSize='inherit' />
        </IconButton>
      ),
      meta: {
        align: 'center',
        width: 100
      }
    }
  ];

  const [activeTab, setActiveTab] = useState('1');
  const handleChangeTabs = (event: string) => {
    const url = {
      pathname: router.pathname,
      query: { ...router.query, tab: event }
    }
    router.replace(url, undefined, { shallow: true });
  };
  const [activeVerticalTab, setActiveVerticleTab] = React.useState(0);
  
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveVerticleTab(newValue);
  };
  interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
  }
  function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`vertical-tabpanel-${index}`}
        aria-labelledby={`vertical-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ p: 1 }}>
            <Typography>{children}</Typography>
          </Box>
        )}
      </div>
    );
  }
  useEffect(() => {
    if (selecteditemId > 0) {
      getData();
    }
  }, [selecteditemId]);

  useEffect(() => {
    const { tab } = router.query;
    if (tab) {
      setActiveTab(tab.toString());
    } 
  }, [router]);

  return (
    <>
      {isLoading ? <DefaultLoader /> : <>
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
          sx={{ mb: 1.5 }}
        >
          <Link underline='hover' color='inherit' component={NextLink} href={'/admin/item'}>Item List</Link>
          <Typography color='text.primary'>Item Details</Typography>
        </Breadcrumbs>
        <Typography variant='h1'>{item?.name}</Typography>
        <Card variant='outlined' sx={{ mb: 2 }}>
          <Grid container columnSpacing={2} px={2}> 
            <Grid item sm={4} xs={6}>
              <dl>
                <dt>Created Date:</dt>
                <dd>{item?.created ? dayjs(item.updated).format('DD/MM/YYYY') : '--'}</dd>

              </dl>
            </Grid>
            <Divider orientation='vertical' variant='middle' flexItem />
            <Grid item sm={4} xs={6}>
              <dl>
                <dt>Updated Date:</dt>
                <dd>{item?.updated ? dayjs(item.updated).format('DD/MM/YYYY') : '--'}</dd>
              </dl>
            </Grid>
          </Grid>
        </Card>

        <Box sx={{ width: '100%', typography: 'body1' }}>

          <TabContext value={activeTab}>
            <Box sx={{ display: 'flex', alignItems: 'center', }}>
              <RitzTabs tabs={['Placements', 'Item Variations']} activeTab={activeTab} emitChange={handleChangeTabs} />
            </Box>
            <RitzTabPanel value='1' sx={{ pt: 2 }}>
              <Button variant="outlined" sx={{ my: 3 }} onClick={() => { modalOpen(true, "Create Placement", 0) }}>Create Placement</Button>
              <RitzTable
                title="Item's Placements"
                data={placements}
                columns={itemPlacementsColumns}
              />
            </RitzTabPanel>
            <RitzTabPanel value={'2'} sx={{ pt: 2 }}>
              <Button variant="outlined" sx={{ my: 3 }} onClick={() => { modalOpenVariation(true, "Create Variation", selecteditemId, 0) }}>Create Variation</Button>
              {/* adding verticle tabs */}
              <Box
                sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex', height: 500 }}
              >
                {
                  itemVariations.length !== 0 ? (
                    <>
                      <Tabs
                        orientation="vertical"
                        variant="scrollable"
                        value={activeVerticalTab}
                        onChange={handleChange}
                        aria-label="Vertical tabs example"
                        sx={{ borderRight: 1, borderColor: 'divider' }}
                      >
                        {itemVariations.map((variation: any, index: any) => (
                          <Tab
                            key={variation.id}
                            label={variation.variation_name}
                            value={index}
                            sx={{ textAlign: 'left' }}
                            onDoubleClick={() => {
                              modalOpenVariation(
                                true,
                                "Update Variation",
                                selecteditemId,
                                variation.id
                              );
                            }}
                          />
                        ))}
                      </Tabs>
                      <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {itemVariations.map((variation: any, index: any) => (
                          <TabPanel key={variation.id} value={activeVerticalTab} index={index}>
                            <RitzTable
                              title="Variation's Operations"
                              data={getItemVariationOperations[activeVerticalTab]}
                              columns={itemOperationColumns}
                            />
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <Button
                                variant="outlined"
                                sx={{ mt: 2, mb: 2 }}
                                onClick={() => {
                                  modalOpenOperation(true, "Create Operation", 0, variation.id);
                                }}
                              >
                                Add Operation
                              </Button>
                            </Box>
                          </TabPanel>
                        ))}
                      </Box>
                    </>
                  ) : (
                    <Alert severity='info' icon={false} sx={{ mb: 2, mt: 2, height: '50px' }}> {"No variations available for this item. Please create a new variation."}</Alert>
                  )
                }
              </Box>
            </RitzTabPanel>
          </TabContext>
        </Box>
        {open && (
          <CreatePlacement
            openModal={open}
            closeModalData={handleModalClose}
            title={title}
            submitId={editPlacementId}
            selecteditemId={selecteditemId}
            savedPlacements={handleGetSavedData}
          />
        )}
        {openVariaton && (
          <CreateVariation
            openModal={openVariaton}
            closeModalData={handleModalCloseVariation}
            title={title}
            selecteditemId={selecteditemId}
            savedVariations={handleGetSavedData}
            selectedVariationId={editVariationId}
          />
        )}
        {openOperation && (
          <CreateOperation
            openModal={openOperation}
            closeModalData={handleModalCloseOperation}
            title={title}
            selecteditemId={selecteditemId}
            selectedVariationId={editVariationId}
            selectedOperationId={editOperationId}
            savedVariations={handleGetSavedData}
            saveOperationURL={RestUrls.createVariationOperationURL()}
          />
        )}
      </>}
    </>
  );
};
export default ItemDetailView;