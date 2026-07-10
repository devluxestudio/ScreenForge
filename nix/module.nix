# NixOS module for ScreenForge
# Usage in flake-based NixOS config:
#
#   inputs.screenforge.url = "github:EtienneLescot/screenforge";
#
#   { inputs, ... }: {
#     imports = [ inputs.screenforge.nixosModules.default ];
#     programs.screenforge.enable = true;
#   }
self:
{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.programs.screenforge;
in
{
  options.programs.screenforge = {
    enable = lib.mkEnableOption "ScreenForge screen recorder";

    package = lib.mkOption {
      type = lib.types.package;
      default = self.packages.${pkgs.stdenv.hostPlatform.system}.screenforge;
      defaultText = lib.literalExpression "inputs.screenforge.packages.\${pkgs.stdenv.hostPlatform.system}.screenforge";
      description = "The ScreenForge package to use.";
    };
  };

  config = lib.mkIf cfg.enable {
    environment.systemPackages = [ cfg.package ];

    # Screen capture on Wayland requires xdg-desktop-portal.
    # We enable the base portal; users should also enable a
    # desktop-specific portal (e.g. xdg-desktop-portal-gtk,
    # xdg-desktop-portal-hyprland) in their DE config.
    xdg.portal.enable = lib.mkDefault true;
  };
}
