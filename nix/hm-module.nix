# Home Manager module for ScreenForge
# Usage in flake-based Home Manager config:
#
#   inputs.screenforge.url = "github:EtienneLescot/screenforge";
#
#   { inputs, ... }: {
#     imports = [ inputs.screenforge.homeManagerModules.default ];
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
    home.packages = [ cfg.package ];
  };
}
