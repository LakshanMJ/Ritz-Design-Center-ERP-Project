import React, { useEffect, useState } from 'react';
import * as RestUrls from '../../helpers/constants/RestUrls';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Box, Button, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import Paper from '@mui/material/Paper';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import RitzSelection from '@/components/Ritz/RitzSelection';
import SaveSpinner from '@/components/SaveSpinner';
import { purchaseOrderDetailPageURL, purchaseOrderQuantityToOrderQuantityMatchingURL } from '@/helpers/constants/FrontEndUrls';
import router from 'next/router';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import { grey } from '@mui/material/colors';

const POColorwayColorMapping = ({ purchaseOrderId, activeTab, refreshData }: any) => {
  const [isLoading, setIsLoading] = useState(false);
  const [saveClicked, setSaveClicked] = useState(false);
  const [nextLoading, setNextLoading] = useState(false);
  const [prevLoading, setPrevLoading] = useState(false);
  const [poColorwayCategoryItems, setPoColorwayCategoryItems] = useState([]);
  const [firstPoColorwayCategoryItems, setFirstPoColorwayCategoryItems] = useState({po_colorway_items: []});
  const [poColorwayItems, setPoColorwayItems] = useState({ colorway_item_types: [] });
  const [purchaseOrderColorways, setPurchaseOrderColorways] = useState({ po_colorways: [], order_colorways: [] });

  const getPurchaseOrderColorwayList = () => {
    if (purchaseOrderId > 0) {
      setIsLoading(true);
      api.get(RestUrls.purchaseOrderColorwaysListURL(purchaseOrderId))
        .then((resp) => {
          const resdata = resp?.data || [];
          setPurchaseOrderColorways({ ...resdata });
        })
        .catch((error) => {
          toast.error(getDefaultError(error?.response?.status));
        })
        .finally(() => setIsLoading(false));
    }
  };

  const getColorwayCategoryItemList = () => {
    if (purchaseOrderId > 0) {
      setIsLoading(true);
      api.get(RestUrls.poColorwayItemListURL(purchaseOrderId))
        .then((resp) => {
          const resdata = resp?.data || [];
          const[firstItem] = resdata
          setFirstPoColorwayCategoryItems(firstItem)
          setPoColorwayCategoryItems([...resdata]);
        })
        .catch((error) => {
          toast.error(getDefaultError(error?.response?.status));
        })
        .finally(() => setIsLoading(false));
    }
  };

  const getColorwayItemList = () => {
    if (purchaseOrderId > 0) {
      setIsLoading(true);
      api.get(RestUrls.poColorwayItemList(purchaseOrderId))
        .then((resp) => {
          const resdata = resp?.data || {};
          setPoColorwayItems({ ...resdata });
        })
        .catch((error) => {
          toast.error(getDefaultError(error?.response?.status));
        })
        .finally(() => setIsLoading(false));
    }
  };

  const handleCostingColorwayChange = (event: any, colorwayId: any) => {
    const selectedColorway = event.target.value;
    if (selectedColorway) {
      const updatedCostingOrderColorways = purchaseOrderColorways.po_colorways.map((colorway) => {
        if (colorway.id === colorwayId) {
          const updatedColorway = { ...colorway, order_colorway: selectedColorway };
          return updatedColorway;
        }
        return colorway;
      });
      setPurchaseOrderColorways((prevState) => ({ ...prevState, po_colorways: updatedCostingOrderColorways }));
    }
  };

  const handleColorChange = (event: any, itemId: any) => {
    const colorwayColor = event.target.value;
    const updatedPoColorwayItems = poColorwayCategoryItems.map((colorway: any) => {
      const updatedColorwayItems = colorway.po_colorway_items.map((item: any) => {
        if (item.po_colorway_item_id === itemId) {
          return { ...item, colorway_category_color: colorwayColor };
        }
        return item;
      });

      return { ...colorway, po_colorway_items: updatedColorwayItems };
    });

    setPoColorwayCategoryItems(updatedPoColorwayItems);
  };

  const colorwayCategory = poColorwayItems.colorway_item_types;

  const handlePreviousButtonAction = () => {
    try {
      setPrevLoading(true);
      router.push(purchaseOrderQuantityToOrderQuantityMatchingURL(purchaseOrderId));
    } finally {
      setPrevLoading(false);
    }
  };

  const handleSaveButtonAction = () => {
    try {
      setSaveClicked(true);
      const enableErrorValidation = false;
      const directToDetailsPage = false;
      handleSave(directToDetailsPage as boolean, enableErrorValidation as boolean);
    } catch (error) {
    } finally {
      setSaveClicked(false);
    }
  };

  const handleNextButtonAction = () => {
    try {
      setNextLoading(true);
      const enableErrorValidation = true;
      const directToDetailsPage = false;
      setNextLoading(true);
      handleSave(directToDetailsPage as boolean, enableErrorValidation as boolean);
    } finally {
      setNextLoading(false);
    }
  };

  const handleSave = (directToDetailsPage: boolean, enableErrorValidation: boolean) => {
    const updatedPurchaseOrderColorways = purchaseOrderColorways.po_colorways.map((colorway) => ({
      po_colorway_id: colorway.id,
      order_colorway_id: colorway.order_colorway,
    }));

    const updatedPurchaseOrderColorwayColors = poColorwayCategoryItems
      .map((colorwayCategory) =>
        colorwayCategory.po_colorway_items.map((item: any) => ({
          po_colorway_item_id: item.po_colorway_item_id,
          po_colorway_item_color: item.colorway_category_color,
        }))
      )
      .reduce((acc, val) => acc.concat(val), []);

    const requests = [
      api.post(RestUrls.purchaseOrderColorwaysMatchingURL(enableErrorValidation), updatedPurchaseOrderColorways),
      api.post(RestUrls.poColorwayItemColorMappingURL(), { po_colorway_items: updatedPurchaseOrderColorwayColors }),
    ];
    Promise.all(requests)
      .then((resp) => {
        const respData = resp.map((r: any) => r.data);
        const [colorwayMatchingData, itemcolorMappingData] = resp.map((r: any) => r.data)
        if (colorwayMatchingData.status === 'Successfully Updated' && itemcolorMappingData) {
          refreshData()
        }else if(colorwayMatchingData.error === 'Please Match All PO Colorways'){
          toast.error(getDefaultError(itemcolorMappingData.error));
        }
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      });
  };

  const getColorwayCategoryDisplay = (colorway: any, columnIndex: any) => {
    const matchingColorway = purchaseOrderColorways.po_colorways.find(
      (poColorway) => poColorway.po_colorway_id === colorway.po_colorway
    );
  
    if (matchingColorway) {
      const matchingCategories = colorwayCategory.filter(
        (category) => category.colorway === matchingColorway.order_colorway
      );
  
      if (matchingCategories.length > columnIndex) {
        const matchedCategory = matchingCategories[columnIndex];
        return matchedCategory.colorway_category_display;
      }
    }
  
    return '';
  };

  useEffect(() => {
    getPurchaseOrderColorwayList();
    getColorwayCategoryItemList();
    getColorwayItemList();
  }, [purchaseOrderId]);

  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <TableContainer sx={{borderRadius: '5px', border: (theme) =>  `1px solid ${theme.palette.divider}`}}>
            <Table sx={{ minWidth: 650 }} aria-label="simple table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '200px' }}>Purchase Order Colorway</TableCell>
                  <TableCell sx={{ width: '200px' }}>Costing Order Colorway</TableCell>
                  {firstPoColorwayCategoryItems?.po_colorway_items?.map((item: any) => (
                    <TableCell key={item.item_id} sx={{ width: '200px' }}>
                      {item.po_item_name}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {poColorwayCategoryItems.map((colorway, rowIndex) => (
                  <TableRow key={rowIndex} sx={{ "&:hover": { backgroundColor: grey[100] }}} >
                    <TableCell sx={{ width: '200px' }}>
                      <Typography sx={{ marginTop: activeTab > 0 ? 0 : getColorwayCategoryDisplay(colorway, 0) ? '25px' : '0' }}>
                        {colorway.po_colorway_name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ width: '200px' }}>
                      {activeTab > 0 ? (
                        <Typography>
                          {colorwayCategory?.find((category) =>
                            category.colorway === purchaseOrderColorways.po_colorways.find((poColorway) => poColorway.po_colorway_id === colorway.po_colorway)?.order_colorway
                          )?.colorway_name || 'Not Assigned'}
                        </Typography>
                      ) : (
                        <Box sx={{ marginTop: getColorwayCategoryDisplay(colorway, 0) ? '20px' : '0' }}>
                          <RitzSelection
                            id={'id'}
                            name={'colorway'}
                            optionValue={'id'}
                            optionText={'colorway'}
                            selectedValue={purchaseOrderColorways.po_colorways.find(
                              (colorwayCategory) => colorwayCategory.po_colorway_id === colorway.po_colorway
                            )?.order_colorway || ''}
                            isRequired={true}
                            size={'small'}
                            fullWidth
                            options={purchaseOrderColorways.order_colorways}
                            handleOnChange={(event: any) => handleCostingColorwayChange(event, colorway.po_colorway)}
                          />
                        </Box>
                      )}
                    </TableCell>
                    {colorway.po_colorway_items.map((item: any, columnIndex: number) => (
                      <TableCell key={`${rowIndex}-${columnIndex}`} sx={{ width: '200px', paddingTop: '-20px' }}>
                        {activeTab > 0 ? (
                          <Typography>
                            {(colorway.po_colorway_items.find((cwItem: any) => cwItem.po_colorway_item_id === item.po_colorway_item_id)
                              ?.po_item_colorway_category_type || '') +
                              ' ( ' +
                              (colorway.po_colorway_items.find((cwItem: any) => cwItem.po_item_id === item.po_item_id)?.colorway_category_color || 'Not Assigned') +
                              ' )'}
                          </Typography>
                        ) : (
                          <Box>
                            <Typography sx={{ marginRight: getColorwayCategoryDisplay(colorway, columnIndex) ? '' : '0' }}>
                              {getColorwayCategoryDisplay(colorway, columnIndex)}
                            </Typography>
                            <TextField
                              id={`po_item_colorway_category_color_${item.po_colorway_item_id}`}
                              size="small"
                              name={`po_item_colorway_category_color_${item.po_colorway_item_id}`}
                              value={colorway.po_colorway_items.find((cwItem: any) => cwItem.po_colorway_item_id === item.po_colorway_item_id)?.colorway_category_color || ''}
                              fullWidth
                              onChange={(event: any) => handleColorChange(event, item.po_colorway_item_id)}
                            />
                          </Box>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
            </TableBody>
            </Table>
          </TableContainer>
          {activeTab === undefined && (
            <>
              {/* <Button variant="contained" sx={{ marginTop: '1%', paddingLeft: '2%', paddingRight: '2%', marginRight: '5%' }} onClick={handlePreviousButtonAction}>
                {prevLoading ? <SaveSpinner /> : <> </>}Previous
              </Button>
              <Button variant="contained" sx={{ float: 'right', marginTop: '1%', paddingLeft: '2%', paddingRight: '2%' }} onClick={() => handleNextButtonAction()}>
                {nextLoading ? <SaveSpinner /> : <> </>}Next
              </Button> */}
              <Button variant="contained" sx={{ float: 'right', marginTop: '1%', paddingLeft: '2%', paddingRight: '2%' }} onClick={() => handleNextButtonAction()}>
                {nextLoading ? <SaveSpinner /> : <> </>}Save
              </Button>
              {/* <Button variant="contained" sx={{ float: 'right', marginTop: '1%', paddingLeft: '2%', paddingRight: '2%', marginRight: '1%' }} onClick={handleSaveButtonAction}>
                {saveClicked ? <SaveSpinner /> : <> </>}Save
              </Button> */}
            </>
          )}
        </>
      )}
    </>
  );
};

export default POColorwayColorMapping;
