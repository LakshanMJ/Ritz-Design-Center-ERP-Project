import { Box, Card, Grid, Typography } from "@mui/material";

const CustomerBrandMaterialDetail = ({material}:any) => {
return(
     <Box>
            <Box marginBottom={3}>
            <Box sx={{ mb: 2 }}><Typography variant='h6' color={'primary'}>Material Detail</Typography></Box>
                <Card variant='outlined' sx={{ mb: 2 }}>
                    <Grid container columnSpacing={2} px={2}>
                        <Grid item sm={3} xs={12}>
                            <dl>
                                <dt>Material</dt>
                                <dd>{material?.attributes?.material_label || '--'}</dd>
                            </dl>
                        </Grid>
                        <Grid item sm={3} xs={12}>
                            <dl>
                                <dt style={{ marginTop: 5 }}>Customer Reference Code</dt>
                                <dd>{material?.attributes?.reference_code || '--'}</dd>
                            </dl>
                        </Grid>
                        <Grid item sm={3} xs={12}>
                            <dl>
                                <dt style={{ marginTop: 5 }}>Ritz Reference Code</dt>
                                <dd>
                                    <Box display="flex" alignItems="center">
                                        {material?.attributes?.ritz_customer_brand_reference_code}
                                    </Box>
                                </dd>
                            </dl>
                        </Grid> 
                        {material?.headers?.map((header: any, headerIndex: any) => (
                            <Grid item sm={3} xs={12} key={headerIndex}>
                                <dl>
                                    <dt style={{ marginTop: 5 }}>{header.label}</dt>
                                    <dd>
                                        <Box display="flex" alignItems="center">
                                            {material?.attributes?.[header.name]}
                                          
                                        </Box>
                                    </dd>
                                </dl>
                            </Grid>
                        ))}
                    </Grid>
                </Card>
        </Box>
     </Box>
);
}
export default CustomerBrandMaterialDetail;