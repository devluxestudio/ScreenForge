> [!NOTE]
> This repository is an independent continuation of ScreenForge.
>
> ScreenForge was originally created by [Siddharth Vaddem](https://github.com/siddharthvaddem). The original repository was archived after v1.5.0 and remains available here: [siddharthvaddem/screenforge](https://github.com/siddharthvaddem/screenforge).
>
> This fork continues development under the ScreenForge name with the original author's approval, while remaining fully MIT open source.

> [!WARNING]
> ScreenForge is not production-grade software. You should expect bugs, rough edges, and occasional breaking changes.

<p align="center">
  <img src="public/screenforge.png" alt="ScreenForge Logo" width="64" />
</p>

# <p align="center">ScreenForge</p>

<p align="center"><strong>ScreenForge is a free, open-source tool for creating polished screen recordings, product demos, and walkthroughs.</strong></p>

ScreenForge was originally positioned as a free, open-source alternative to Screen Studio: something you can use to create quick, polished product demos and walkthroughs for X, Reddit, YouTube, documentation, landing pages, or internal demos.

It is not a 1:1 clone of Screen Studio. Screen Studio is an excellent commercial product. ScreenForge focuses on covering the core open-source workflow: recording, zooms, cursor effects, webcam overlay, captions, editing, annotations, and export.

The goal of this continuation is to keep ScreenForge alive as a fully open-source project and progressively evolve it toward a broader recording and editing workflow.

**100% free** for both **personal** and **commercial** use. Use it, modify it, distribute it. Please respect the license.

> [!NOTE]
> Software should be accessible. ScreenForge has no paid tiers, premium features, upsells, or functionality locked behind a paywall.

<p align="center">
	<img src="public/demo.png" alt="" style="height: 0.2467; margin-right: 12px;" />
  <img src="public/sample.png" alt="" style="height: 0.2467; margin-right: 12px;" />
</p>

## Core Features
- Record a specific window, or your whole screen.
- Record microphone and system audio.
- Webcam overlay with picture-in-picture, drag-to-position, mirroring, and shape options.
- Auto or manual zooms with adjustable depth, duration, easing, and pixel-precise position; auto-zoom follows your cursor as you work.
- Custom cursor size, smoothing, and click effects, with cursor themes and post-recording path smoothing.
- Automatic captions for voiceovers, generated on-device with no upload (works offline).
- Wallpapers, solid colors, gradients, or your own background image.
- Motion blur.
- Crop, trim, and per-segment speed control on the timeline.
- Text, arrow, and image annotations, with text animation presets.
- Timeline snapping guides and an audio waveform to make trimming easier.
- Customizable keyboard shortcuts.
- Export to MP4 or GIF in multiple aspect ratios and resolutions.
- Languages supported: Arabic, English, Spanish, French, Italian, Japanese, Korean, Portuguese (Brazil), Russian, Turkish, Vietnamese, Simplified Chinese, and Traditional Chinese.


## Installation

Download the latest installer for your platform from the [GitHub Releases](https://github.com/EtienneLescot/screenforge/releases) page.

### macOS

Download the `.dmg` installer directly from the [Releases page](https://github.com/EtienneLescot/screenforge/releases). If Gatekeeper blocks the app, you can bypass it by running the following command in your terminal after installation:

```bash
xattr -rd com.apple.quarantine /Applications/Openscreen.app
```

Note: Give your terminal Full Disk Access in **System Settings > Privacy & Security** to grant you access and then run the above command.

After running this command, proceed to **System Preferences > Security & Privacy** to grant the necessary permissions for "screen recording" and "accessibility". Once permissions are granted, you can launch the app.

> [!NOTE]
> **Upgrading from an older version and hitting permission issues?** If you already had ScreenForge installed and the new version won't record (Screen Recording or Accessibility keep failing even after you grant them), uninstall the old version, remove ScreenForge's existing entries under **System Settings > Privacy & Security** (both Screen Recording and Accessibility), then do a fresh install and grant the permissions again when prompted.

### Windows

Download the `.exe` installer directly from the [Releases page](https://github.com/EtienneLescot/screenforge/releases).

### Linux

Three packages are published to the [Releases page](https://github.com/EtienneLescot/screenforge/releases) for each version. Pick the one that matches your distro:

**Debian / Ubuntu / Pop!_OS (`.deb`)**
```bash
sudo apt install ./Openscreen-Linux-latest.deb
```

**Arch / Manjaro (`.pacman`)**
```bash
sudo pacman -U Openscreen-Linux-latest.pacman
```

**Any distro (`.AppImage`)**
```bash
chmod +x Openscreen-Linux-*.AppImage
./Openscreen-Linux-*.AppImage
```

**NixOS / Nix (flake)**

Try without installing:
```bash
nix run github:EtienneLescot/screenforge
```

Install into your user profile:
```bash
nix profile install github:EtienneLescot/screenforge
```

For a NixOS system config (flake):
```nix
{
  inputs.screenforge.url = "github:EtienneLescot/screenforge";

  outputs = { nixpkgs, screenforge, ... }: {
    nixosConfigurations.<host> = nixpkgs.lib.nixosSystem {
      modules = [
        screenforge.nixosModules.default
        { programs.screenforge.enable = true; }
      ];
    };
  };
}
```

For Home Manager, use `screenforge.homeManagerModules.default` with the same `programs.screenforge.enable = true;`.

You may need to grant screen recording permissions depending on your desktop environment.

**Sandbox error:** If the AppImage fails to launch with a "sandbox" error, run it with `--no-sandbox`:
```bash
./Openscreen-Linux-*.AppImage --no-sandbox
```

### Platform differences

Everything in the editor and export is the same on macOS, Windows, and Linux: zooms, backgrounds, motion blur, crop/trim/speed, blur regions, annotations, auto-captions, projects, export, and all languages. The differences are in **capture**, where macOS and Windows use a native pipeline that Linux doesn't have:

- **Native recording**: macOS (ScreenCaptureKit) and Windows (Windows Graphics Capture) record through a native pipeline for higher quality and clean window-level capture. Linux records through the browser pipeline instead.
- **Custom cursors**: on macOS and Windows the real cursor is captured (shape, type, and clicks), which powers the cursor themes, click effects, and editable cursor overlay. On Linux only the cursor position is captured (used for auto-zoom), so those cursor options aren't available.
- **Webcam**: captured natively on macOS and Windows; on Linux it's recorded through the browser, but still works as a picture-in-picture overlay.
- **System audio** support varies by OS:
  - **macOS**: requires macOS 13+. On macOS 14.2+ you'll be prompted to grant audio capture permission. macOS 12 and below can't capture system audio (mic still works).
  - **Windows**: works out of the box.
  - **Linux**: needs PipeWire (default on Ubuntu 22.04+, Fedora 34+). Older PulseAudio-only setups may not capture system audio (mic should still work).

## Official links

This repository is the community-maintained continuation of ScreenForge.

Official / trusted links:

* Original archived repository: https://github.com/siddharthvaddem/screenforge
* Community continuation: https://github.com/EtienneLescot/screenforge

For safety, download ScreenForge only from the official GitHub Releases linked from this repository. Third-party websites using the ScreenForge name are not affiliated with this continuation unless explicitly listed here.

---

## License

This project is licensed under the [MIT License](./LICENSE). By using this software, you agree that the authors are not liable for any issues, damages, or claims arising from its use.
