import React, { useEffect, useState } from "react";
import DefaultLoader from "../../components/DefaultLoader";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import { Grid, Card, CardActionArea, CardContent, Typography, Box, Link, Alert, Divider, Tooltip } from "@mui/material";
import NextLink from 'next/link';
import { createdGrnDetailsPageURL } from "@/helpers/constants/front_end/GrnUrls";
import api from "@/services/api";
import { orderProcessWidgetsDetailsURL } from "@/helpers/constants/RestUrls";
import { getDefaultError } from "@/helpers/Utilities";
import toast from "react-hot-toast";
import { orderSummaryVersionURL, purchaseOrderDetailPageURL } from "@/helpers/constants/FrontEndUrls";
import { purchaseOrderClubDetailsPageURL } from "@/helpers/constants/front_end/POUrls";

const DetailView = ({ clubId }: any) => {
  const keyHelper = new ReactKeyHelper();
  const [isLoading, setIsLoading] = useState(false);
  const [detailDataSet, setDetailDataSet] = useState<any>({})

  const fetchData = () => {
    setIsLoading(true);
    api.get(orderProcessWidgetsDetailsURL(clubId)).then(resp => {
      const respData = resp?.data || {};
      setDetailDataSet({ ...respData });
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false);
    });
  }

  useEffect(() => {
    if (clubId) {
      fetchData();
    }
  }, [clubId]);

  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <Box sx={{ mt: 1 }}>
            <Box>
              <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Marketing Costing</Typography>
            </Box>
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={2}>

                  <Card
                    sx={{
                      boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
                      backgroundColor: "#f0f4f8",
                      color: "#333",
                      borderRadius: "8px",
                    }}
                  >
                    <Tooltip title={detailDataSet?.data?.marketing_costing?.display_number || ""}>
                      <CardActionArea>
                        <CardContent>
                          <Link target={'_blank'} href={orderSummaryVersionURL(detailDataSet?.data?.marketing_costing?.order_id, detailDataSet?.data?.marketing_costing?.id)} component={NextLink}>
                            <Typography variant="h6" sx={{ fontWeight: "bold" }}>{detailDataSet?.data?.marketing_costing?.version_display_number}</Typography>
                          </Link>
                        </CardContent>
                      </CardActionArea>
                    </Tooltip>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Box>
          <Divider sx={{ mt: 2 }} />
          <Box sx={{ mt: 1 }}>
            <Box>
              <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Pre Costing</Typography>
            </Box>
            <Box>
              {detailDataSet?.data?.pre_costing?.id ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={2}>
                    <Card
                      sx={{
                        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
                        backgroundColor: "#f0f4f8",
                        color: "#333",
                        borderRadius: "8px",
                      }}
                    >
                      <Tooltip title={detailDataSet?.data?.pre_costing?.display_number || ""}>
                        <CardActionArea>
                          <CardContent>
                            <Link target={'_blank'} href={orderSummaryVersionURL(detailDataSet?.data?.pre_costing?.order_id, detailDataSet?.data?.pre_costing?.id)} component={NextLink}>
                              <Typography variant="h6" sx={{ fontWeight: "bold" }}>{detailDataSet?.data?.pre_costing?.version_display_number}</Typography>
                            </Link>
                          </CardContent>
                        </CardActionArea>
                      </Tooltip>
                    </Card>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity='info' icon={false}>No pre costing currently available.</Alert>
              )}

            </Box>
          </Box>
          <Divider sx={{ mt: 2 }} />
          <Box sx={{ mt: 1 }}>
            <Box>
              <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Purchase Order Club</Typography>
            </Box>
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={2}>
                  <Card
                    sx={{
                      boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
                      backgroundColor: "#f0f4f8",
                      color: "#333",
                      display: "inline-block",
                    }}
                  >
                    <CardActionArea>
                      <CardContent>
                        <Link target={'_blank'} href={purchaseOrderClubDetailsPageURL(detailDataSet.id)} component={NextLink}>
                          <Typography variant="h6" sx={{ fontWeight: "bold" }}>{detailDataSet?.display_number}</Typography>
                        </Link>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Box>
          <Divider sx={{ mt: 2 }} />
          <Box sx={{ mt: 1 }}>
            <Box>
              <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Purchase Orders</Typography>
            </Box>
            <Box>
              {detailDataSet.data?.purchase_orders?.length === 0 ? (
                <Box sx={{ p: 3 }}>
                  <Alert severity="info" icon={false}>
                    No POs are currently available.
                  </Alert>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {detailDataSet.data?.purchase_orders?.map((po: any, poIndex: any) => (
                    <Grid item xs={12} sm={6} md={2} key={poIndex}>
                      <Card
                        sx={{
                          boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
                          backgroundColor: "#f0f4f8",
                          color: "#333",
                          display: "inline-block",
                        }}
                      >
                        <CardActionArea>
                          <CardContent>
                            <Link
                              target="_blank"
                              href={purchaseOrderDetailPageURL(po?.id)}
                              component={NextLink}
                            >
                              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                                {po?.display_number}
                              </Typography>
                            </Link>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Box>
          <Divider sx={{ mt: 2 }} />
          <Box sx={{ mt: 1 }}>
            <Box>
              <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Supplier POs</Typography>
            </Box>
            <Box>
              {detailDataSet.data?.supplier_pos?.length === 0 ? (
                <Box>
                  <Alert severity="info" icon={false}>No supplier PO's are currently available.</Alert>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {detailDataSet.data?.supplier_pos?.map((spo: any, spoIndex: any) => (
                    <Grid item xs={12} sm={6} md={2} key={spoIndex}>
                      <Card
                        sx={{
                          boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
                          backgroundColor: "#f0f4f8",
                          color: "#333",
                          display: "inline-block",
                        }}
                      >
                        <CardActionArea>
                          <CardContent>
                            <Link
                              target="_blank"
                              href={spo?.file?.file_path || "#"}
                              component={NextLink}
                            >
                              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                                {spo.display_number}
                              </Typography>
                            </Link>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </Box>
          <Divider sx={{ mt: 2 }} />
          <Box sx={{ mt: 1 }}>
            <Box>
              <Typography sx={{ fontWeight: 'bold', mb: 1 }}>GRNs</Typography>
            </Box>
            {detailDataSet.data?.grns?.length === 0 ? (
              <Box>
                <Alert severity="info" icon={false}>No GRN's are currently available.</Alert>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {detailDataSet.data?.grns?.map((grn: any, grnIndex: any) => (
                  <Grid item xs={12} sm={6} md={2} key={grnIndex}>
                    <Card
                      sx={{
                        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
                        backgroundColor: "#f0f4f8",
                        color: "#333",
                        borderRadius: "8px",
                      }}
                    >
                      <CardActionArea>
                        <CardContent>
                          <Link
                            target="_blank"
                            href={createdGrnDetailsPageURL(grn?.id)}
                            component={NextLink}
                          >
                            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                              {grn?.display_number}
                            </Typography>
                          </Link>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </>
      )}
    </>
  );
};

export default DetailView;