import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from "@mui/material";

export default function Breadcrumbs({ crumbs, onNavigate }) {
  if (!crumbs || crumbs.length === 0) return null;
  return (
    <MuiBreadcrumbs sx={{ py: 1 }}>
      {crumbs.map((c, i) =>
        i === crumbs.length - 1 ? (
          <Typography key={c.path} color="text.primary" sx={{ fontWeight: 500 }}>
            {c.name}
          </Typography>
        ) : (
          <Link
            key={c.path}
            component="button"
            underline="hover"
            color="inherit"
            onClick={() => onNavigate(c.path)}
          >
            {c.name}
          </Link>
        )
      )}
    </MuiBreadcrumbs>
  );
}
