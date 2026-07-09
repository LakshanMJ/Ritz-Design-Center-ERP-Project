import React, {useEffect} from "react";
import {useState} from "react";
import {useRouter} from "next/router";
import * as RestUrls from '../../helpers/constants/RestUrls';
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import {
    Alert,
    Breadcrumbs,
    Card,
    Divider,
    Grid,
    InputLabel,
    Link,
    MenuItem,
    Paper,
    Select,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs
} from "@mui/material";
import NextLink from 'next/link';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import RitzTable from "@/components/Ritz/RitzTable";
import CopyOperation from "@/views/ie_interface/CopyOperation";
import {ColumnDef} from "@tanstack/react-table";
import api from "@/services/api";
import EditIcon from '@mui/icons-material/Edit';
import DefaultLoader from "@/components/DefaultLoader";
import {TabContext} from "@mui/lab";
import {RitzTabPanel, RitzTabs} from "@/components/Ritz/RitzTabs";
import LaunchIcon from '@mui/icons-material/Launch';
import CreateVariation from "../settings/item/CreateVariation";
import CreateOperation from "../settings/item/CreateOperation";
import toast from "react-hot-toast";
import {getDefaultError} from "@/helpers/Utilities";
import RitzSelection from "@/components/Ritz/RitzSelection";
import {DragDropContext, Draggable, Droppable} from 'react-beautiful-dnd';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import RitzModal from "@/components/Ritz/RitzModal";
import DeleteIcon from '@mui/icons-material/Delete';

const ItemDetailView = () => {

   
    const tabDisplayOrderKey = 'tabDisplayOrder';
    const tabLabel = 'tabLabel';
    const itemsTabKey = 'items_tabs';
    const itemOperationsTabKey = 'item_operations';

    const operationTabsMappings = {
        [itemsTabKey]: {[tabDisplayOrderKey]: '1', [tabLabel]: 'Items'},
        [itemOperationsTabKey]: {[tabDisplayOrderKey]: '2', [tabLabel]: 'Item Operations'},
    };


    const router = useRouter();
    const {tab} = router.query;
    const [editOperationId, setOperationId] = useState(0);
    const [editVariationId, setVariationId] = useState(0);
    const [openOperation, setOpenOperation] = useState(false);
    const [items, setItems] = useState<any>([]);
    const [title, setTitle] = useState<string>()
    const [isLoading, setIsLoading] = useState(true);
    const [showErrorNotification, setShowErrorNotification] = useState({status: false, message: ""});
    const [itemErrors, setItemError] = useState<any>({});
    const [operations, setOperation] = useState({item_id: '', variations: [], name: ''});
    const [operationsTabs, setOperationsTabs] = useState([operationTabsMappings[itemsTabKey][tabLabel], operationTabsMappings[itemOperationsTabKey][tabLabel]]);
    const [activeTab, setActiveTab] = useState('1');
    const [openModal, setOpenModal] = useState(false);
    const [openCopyOption, setOpenCopyOption] = useState(false);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [deleteOperationId, setDeleteOperationId] = useState(null);

    const getOperationList = (itemId: any) => {
        const operatiList = RestUrls.getItemOperationsURL(itemId);
        api.get(operatiList).then(resp => {
            const resdata = resp?.data || {};
            setOperation({...resdata});
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }

    const getData = () => {
        setIsLoading(true);
        const requests = [
            api.get(RestUrls.itemsURL()),
        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [item] = respData;
            setItems([...item]);
        }).catch(error => {
            if (error.response && error.response.data) {
                const errorMsg = error.response.data;
                setItemError({errorMsg});
            } else {
                setShowErrorNotification({status: true, message: "Oops, something wasn't right"})
            }
        }).finally(() => setIsLoading(false));
    }

    const handleModalCloseOperation = (status: any) => {
        setOpenOperation(status)
    };


    const handleDeleteOperation = (operationId:any) => {
        setDeleteOperationId(operationId);
        setOpenDeleteModal(true);
    };

    const confirmDeleteOperation = () => {
        const deleteUrl = RestUrls.deleteOperationURL(deleteOperationId);
        api.delete(deleteUrl).then(resp => {
            toast.success("Operation deleted successfully!");
            getOperationList(operations.item_id);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setOpenDeleteModal(false);
            setDeleteOperationId(null);
        });
    };

    const handleGetSavedData = (data: any) => {
        getData();
        getOperationList(operations.item_id)
    };

    const handleSelectChangeItem = (event: any) => {
        setOperation({...operations, item_id: event.target.value});
    };

    const modalClose = () => {
        setOpenModal(false);
    };

    const modalOpenOperation = (isOpen: any, title: string, operationId: any, variationId: any) => {
        setTitle(title)
        setOperationId(operationId);
        setVariationId(variationId);
        setOpenOperation(isOpen);
    };

    const handleCopyOperationClick = () => {
        setTitle("Copy Operation");
        setOpenCopyOption(true);
        setOpenModal(true);
    };

    //  const getItemVariationOperations = operations.variations?.map((variation: any) =>
    //   variation.operations.filter((operation: any) => operation.variation === variation.id)
    // );

    const [rows, setRows] = React.useState([]);

    //setDisplayOrder();
    const onDragEnd = (result: any) => {
        if (!result.destination) {
            return;
        }
        const movedRow = rows[activeVerticalTab][result.source.index];
        const reorderedRows = [...rows];
        reorderedRows[activeVerticalTab].splice(result.source.index, 1);
        reorderedRows[activeVerticalTab].splice(result.destination.index, 0, movedRow);
        setRows(reorderedRows);
        setDisplayOrder(reorderedRows) 
       
    };

    const itemColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Item',
            cell: (props: any) => (
                <Box
                    onClick={() => handleClickItem(props.row.original)}
                    style={{color: '#1976D2', cursor: 'pointer'}}
                >
                    {props.getValue() ?? ''}
                </Box>
            ),
        },
    ];


    const handleChangeTabs = (event: string) => {
        const url = {
            pathname: router.pathname,
            query: {...router.query, tab: event}
        }
        router.replace(url, undefined, {shallow: true});
    };

    const [activeVerticalTab, setActiveVerticleTab] = React.useState(0);

    const setDisplayOrder = (rows:any) => {
        const displayOrderDataList = rows[activeVerticalTab]?.map((row: any, index: any) => ({
            item_variation_operation_id: row.id,
            display_order: index
        }));
        const displayOrder = RestUrls.itemVariationOperationDisplayOrder();
        api.put(displayOrder, displayOrderDataList).then(resp => {
            const resdata = resp?.data || {};
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }

    const handleClickItem = (variationData: any) => {
        setOperation({
            ...operations,
            item_id: variationData.item_id
        });
        handleChangeTabs(operationTabsMappings[itemOperationsTabKey][tabDisplayOrderKey]);

    };

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveVerticleTab(newValue);
    };

    interface TabPanelProps {
        children?: React.ReactNode;
        index: number;
        value: number;
    }

    function TabPanel(props: TabPanelProps) {
        const {children, value, index, ...other} = props;
        return (
            <div
                role="tabpanel"
                hidden={value !== index}
                id={`vertical-tabpanel-${index}`}
                aria-labelledby={`vertical-tab-${index}`}
                {...other}
            >
                {value === index && (
                    <Box sx={{p: 1}}>
                        <Typography>{children}</Typography>
                    </Box>
                )}
            </div>
        );
    }

    useEffect(() => {
        getData();
    }, []);

    useEffect(() => {  
        if (tab) {
            setActiveTab(tab.toString());
        }
    }, [router]);

    useEffect(() => {

        if (operations.item_id != '') {
            getOperationList(operations.item_id)
        }

    }, [operations.item_id]);

    useEffect(() => {
        if (operations.variations.length > 0) {
            const getItemVariationOperations = operations.variations.map((variation: any) => variation.operations);
            setRows([...getItemVariationOperations])
        }
    }, [operations.variations]);

    // useEffect(() => {
    //     if (displayOrderCalled) {
    //         setDisplayOrder()
    //     }

    // }, [displayOrderCalled]);

    return (
        <>
            <Typography variant='h1'>Item Operation</Typography>
            {isLoading ? <DefaultLoader/> : 
            <>
                <Box sx={{width: '100%', typography: 'body1'}}>
                    <TabContext value={activeTab}>
                        <Box sx={{display: 'flex', alignItems: 'center',}}>
                            <RitzTabs tabs={operationsTabs} activeTab={activeTab}
                                      emitChange={handleChangeTabs}/>
                        </Box>
                        <RitzTabPanel value={`${operationTabsMappings[itemsTabKey][tabDisplayOrderKey]}`} sx={{pt: 2}}>
                            <RitzTable
                                title=""
                                data={items}
                                columns={itemColumns}
                                border={false}
                            />
                        </RitzTabPanel>
                        <RitzTabPanel value={`${operationTabsMappings[itemOperationsTabKey][tabDisplayOrderKey]}`} sx={{pt: 2}}>
                            <Box sx={{mb: 3}}>
                                <InputLabel sx={{mb: 1}}>Item</InputLabel>
                                <RitzSelection
                                    id={'item_id'}
                                    name={'item_id'}
                                    optionValue={'id'}
                                    optionText={'name'}
                                    selectedValue={operations?.item_id}
                                    isRequired={true}
                                    options={items}
                                    handleOnChange={handleSelectChangeItem}
                                />
                            </Box>
                            {/* adding verticle tabs */}
                            <Box
                                sx={{flexGrow: 1, bgcolor: 'background.paper', display: 'flex'}}
                            >

                                {
                                    operations.item_id !== '' ? (
                                        <>
                                            <Tabs
                                                orientation="vertical"
                                                variant="scrollable"
                                                value={activeVerticalTab}
                                                onChange={handleChange}
                                                aria-label="Vertical tabs example"
                                                sx={{borderRight: 1, borderColor: 'divider'}}
                                            >
                                                {operations.variations?.map((variation: any, index: any) => (
                                                    <Tab
                                                        key={variation.id}
                                                        label={variation.variation_name}
                                                        value={index}
                                                        sx={{textAlign: 'left'}}
                                                    />
                                                ))}
                                            </Tabs>
                                            <Box sx={{flex: 1, overflow: 'auto'}}>
                                                {operations.variations?.map((variation: any, index: any) => (
                                                    <TabPanel key={variation.id} value={activeVerticalTab}
                                                              index={index}>
                                                        {/* <RitzTable
                              title="Operations"
                              data={getItemVariationOperations[activeVerticalTab]}
                              columns={itemOperationColumns}
                            /> */}
                                                        <Box sx={{width: '100%', typography: 'body1'}}>
                                                            <TableContainer component={Paper}>
                                                                <Table sx={{minWidth: 650}} aria-label="simple table">
                                                                    <TableHead>
                                                                        <TableRow>
                                                                            <TableCell></TableCell>
                                                                            <TableCell
                                                                                align="left">Operations</TableCell>
                                                                            <TableCell align="left">Costed
                                                                                SMV</TableCell>
                                                                            <TableCell align="left">Factory
                                                                                SMV</TableCell>
                                                                            <TableCell align="left">Machine
                                                                                Type</TableCell>
                                                                            <TableCell align="left">Folder
                                                                                Type</TableCell>
                                                                            <TableCell align="left">Video</TableCell>
                                                                            <TableCell align="left">Action</TableCell>
                                                                        </TableRow>
                                                                    </TableHead>
                                                                    <DragDropContext onDragEnd={onDragEnd}>
                                                                        <Droppable droppableId="rows">
                                                                            {(provided: any) => (
                                                                                <TableBody
                                                                                    ref={provided.innerRef} {...provided.droppableProps}>
                                                                                    {rows[activeVerticalTab]?.map((row: any, index: any) => (
                                                                                        <Draggable
                                                                                            key={row.operation_name}
                                                                                            draggableId={row.operation_name}
                                                                                            index={index}>
                                                                                            {(provided: any) => (
                                                                                                <TableRow
                                                                                                    ref={provided.innerRef}
                                                                                                    {...provided.draggableProps}
                                                                                                    {...provided.dragHandleProps}
                                                                                                    sx={{'&:last-child td, &:last-child th': {border: 0}}}
                                                                                                >
                                                                                                    <TableCell
                                                                                                        align="left"
                                                                                                        style={{
                                                                                                            minWidth: '5px',
                                                                                                            width: '5px',
                                                                                                            maxWidth: '5px'
                                                                                                        }}><DragIndicatorIcon/></TableCell>
                                                                                                    <TableCell
                                                                                                        align="left">{row.operation_name}</TableCell>
                                                                                                    <TableCell
                                                                                                        align="left">{row.costing_smv}</TableCell>
                                                                                                    <TableCell
                                                                                                        align="left">{row.factory_smv}</TableCell>
                                                                                                    <TableCell
                                                                                                        align="left">{row.machine_type_name}</TableCell>
                                                                                                    <TableCell
                                                                                                        align="left">{row.folder_type_name}</TableCell>
                                                                                                    <TableCell
                                                                                                        align="left">
                                                                                                        <Box style={{
                                                                                                            display: 'flex',
                                                                                                            alignItems: 'center'
                                                                                                        }}>
                                                                                                            {row.video &&
                                                                                                                <LaunchIcon
                                                                                                                    style={{marginRight: '10px'}}/>}
                                                                                                            {row.video ? (
                                                                                                                <a
                                                                                                                    href={row.file_details}
                                                                                                                    style={{color: 'blue'}}
                                                                                                                    target="_blank"
                                                                                                                    rel="noopener noreferrer"
                                                                                                                    onClick={() => window.open(row.file_details, '_blank')}
                                                                                                                >
                                                                                                                    {row.display_name}
                                                                                                                </a>
                                                                                                            ) : (
                                                                                                                'No video available'
                                                                                                            )}
                                                                                                        </Box></TableCell>
                                                                                                        <TableCell align="center">
                                                                                                            <IconButton
                                                                                                                size='small'
                                                                                                                color='primary'
                                                                                                                onClick={() => modalOpenOperation(true, "Edit Operation", row.id, row.variation)}
                                                                                                            >
                                                                                                                <EditIcon fontSize='inherit'/>
                                                                                                            </IconButton>
                                                                                                            <IconButton
                                                                                                                size='small'
                                                                                                                color='secondary'
                                                                                                                onClick={() => handleDeleteOperation(row.id)}
                                                                                                            >
                                                                                                                <DeleteIcon fontSize='inherit'/>
                                                                                                            </IconButton>
                                                                                                        </TableCell>
                                                                                                </TableRow>
                                                                                            )}
                                                                                        </Draggable>
                                                                                    ))}
                                                                                    {provided.placeholder}
                                                                                </TableBody>
                                                                            )}
                                                                        </Droppable>
                                                                    </DragDropContext>
                                                                </Table>
                                                            </TableContainer>
                                                        </Box>
                                                        <Box sx={{
                                                                display: 'flex',
                                                                flexDirection: 'row', 
                                                                alignItems: 'flex-end',
                                                                justifyContent: 'flex-end',
                                                                gap: 2
                                                            }}>
                                                            <Button
                                                                variant="outlined"
                                                                sx={{mt: 2, mb: 2}}
                                                                onClick={() => {
                                                                    modalOpenOperation(true, "Create Operation", 0, variation.id);
                                                                }}
                                                            >
                                                                Add Operation
                                                            </Button>
                                                            <Button
                                                                variant="outlined"
                                                                sx={{ mt: 2, mb: 2 }}
                                                                onClick={handleCopyOperationClick}
                                                            >
                                                                Copy Operation
                                                            </Button>
                                                        </Box>

                                                    </TabPanel>
                                                ))}
                                            </Box>
                                        </>
                                    ) : (
                                        <Alert severity='info' icon={false} sx={{
                                            mb: 2,
                                            mt: 2,
                                            height: '50px'
                                        }}> {"Unable to show operation because an item is not selected. Please select an item."}</Alert>
                                    )
                                }
                            </Box>
                        </RitzTabPanel>
                    </TabContext>
                </Box>
                {openOperation && (
                    <CreateOperation
                        openModal={openOperation}
                        closeModalData={handleModalCloseOperation}
                        title={title}
                        selecteditemId={operations.item_id}
                        selectedVariationId={editVariationId}
                        selectedOperationId={editOperationId}
                        variations={operations.variations}
                        savedVariations={handleGetSavedData}
                        getOperationURL={RestUrls.getOperationDetailURL}
                        updateOperationURL={RestUrls.updateVariationOperationURL}
                        saveOperationURL={RestUrls.createVariationOperationURL()}
                    />
                )}
                {openCopyOption && (
                    <RitzModal open={openModal} onClose={modalClose} title={title} isLoading={isLoading} maxWidth={'md'}>
                        <CopyOperation 
                            selecteditemId={operations.item_id} 
                            variationId={operations.variations[activeVerticalTab]?.id} 
                        />
                    </RitzModal>
                )}
                {openDeleteModal && (
                    <RitzModal
                        open={openDeleteModal}
                        onClose={() => setOpenDeleteModal(false)}
                        maxWidth='xs'
                        title='Confirm Delete'
                    >
                        <Box>
                            <Typography>Are you sure you want to delete this operation?</Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'end', mt: 3 }}>
                                <Button variant='contained' onClick={confirmDeleteOperation} color='error'>
                                    Delete
                                </Button>
                            </Box>
                        </Box>
                    </RitzModal>
                )}
            </>}
        </>
    );
};
export default ItemDetailView;