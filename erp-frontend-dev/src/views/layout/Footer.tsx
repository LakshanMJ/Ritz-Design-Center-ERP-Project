import { Box } from "@mui/material";

const Footer = () => (
    <Box sx={{
        flexGrow: 0,
        borderTop: (theme) => `1px solid ${theme.palette.footer.borderColor}`,
        background: (theme) => theme.palette.footer.background,
        px: 3,
        py: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'small',
        color: (theme) => theme.palette.footer.color
    }}>
        © 2025 Nexa Clothing
        {/* Support */}
    </Box>
)

export default Footer;