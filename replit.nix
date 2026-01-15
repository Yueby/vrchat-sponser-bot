{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.nodePackages.pnpm
    pkgs.nodePackages.typescript
  ];
}
