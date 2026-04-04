import { useState, useEffect } from "react";
import { Check, AlertTriangle, FolderPlus, Play, Package, Shield, Smartphone } from "lucide-react";
import DocsLayout, { CodeBlock, useDocsContext } from "@/components/docs/DocsLayout";
import flutterIcon from "@/assets/flutter-icon.png";

const SECTION_IDS = ["flutter-overview", "flutter-setup", "flutter-deps", "flutter-client", "flutter-models", "flutter-provider", "flutter-list", "flutter-upload", "flutter-main", "flutter-run", "flutter-tips"];

export default function FlutterGuidePage() {
  const [activeSection, setActiveSection] = useState("flutter-overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { for (const e of entries) if (e.isIntersecting) setActiveSection(e.target.id); },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );
    SECTION_IDS.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <DocsLayout sectionIds={SECTION_IDS} activeSection={activeSection} onSectionChange={setActiveSection}>
      <Content />
    </DocsLayout>
  );
}

function Content() {
  const { selectedLang, showApiKey, setShowApiKey, activeKey, apiKeyDisplay, baseUrl, rawKeyAvailable } = useDocsContext();
  const codeProps = { showApiKey, onToggleKey: () => setShowApiKey(!showApiKey), hasKey: !!activeKey, baseUrl, apiKey: apiKeyDisplay, rawKeyAvailable };

  return (
    <>
      <section id="flutter-overview">
        <div className="flex items-center gap-3 mb-3">
          <img src={flutterIcon} alt="Flutter" className="w-8 h-8 rounded-lg" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Flutter Integration Guide</h2>
            <p className="text-xs text-muted-foreground">Complete guide to integrate YoCloud API with Flutter (Dart)</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          This guide walks you through building a Flutter mobile/desktop application that connects to the YoCloud REST API.
          You'll create a Dart API client, implement state management with Provider, build file listing and upload screens,
          and run the app on your device or emulator.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Smartphone, title: "Cross-Platform", desc: "Build for iOS, Android, Web, and Desktop from one codebase." },
            { icon: Shield, title: "Dart Types", desc: "Strong type safety with Dart models and null safety." },
            { icon: Package, title: "Provider", desc: "Simple and scalable state management with Provider." },
          ].map(f => (
            <div key={f.title} className="p-3 rounded-xl border border-border bg-secondary/20">
              <f.icon className="w-5 h-5 text-primary mb-2" />
              <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="flutter-setup">
        <StepHeader step={1} title="Create a New Flutter Project" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Make sure Flutter SDK is installed, then create a new project:
        </p>
        <CodeBlock code={`# Install Flutter SDK (if not installed)
# https://docs.flutter.dev/get-started/install

# Create new project
flutter create my_yocloud_app
cd my_yocloud_app`} lang="bash" {...codeProps} />
        <p className="text-[10px] text-muted-foreground mt-2">
          This creates a new Flutter project with Material Design, Dart null safety, and platform-specific build configurations.
        </p>
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-foreground mb-1">📥 Import in your Dart files:</p>
          <CodeBlock code={`// In your Dart files:
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';`} lang="dart" {...codeProps} />
        </div>
      </section>

      <section id="flutter-deps">
        <StepHeader step={2} title="Add Dependencies" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Add required packages to <code className="text-primary font-mono">pubspec.yaml</code>:
        </p>
        <CodeBlock code={`# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.2.0           # HTTP client
  provider: ^6.1.0       # State management
  file_picker: ^8.0.0    # File picker dialog
  flutter_dotenv: ^5.1.0 # Environment variables
  intl: ^0.19.0          # Date formatting`} lang="yaml" {...codeProps} />
        <div className="mt-2">
          <CodeBlock code={`flutter pub get`} lang="bash" {...codeProps} />
        </div>
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-foreground mb-1">Create <code className="text-primary font-mono">.env</code> file:</p>
          <CodeBlock code={`# .env
YOCLOUD_API_KEY={{API_KEY}}
YOCLOUD_BASE_URL={{BASE_URL}}`} lang="bash" {...codeProps} />
        </div>
        <div className="mt-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              <strong className="text-foreground">Security:</strong> Add <code className="font-mono">.env</code> to your <code className="font-mono">.gitignore</code>.
              For production mobile apps, consider using <code className="font-mono">--dart-define</code> flags for compile-time secrets.
            </p>
          </div>
        </div>
      </section>

      <section id="flutter-client">
        <StepHeader step={3} title="Create the API Client" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">lib/services/yocloud_service.dart</code>:
        </p>
        <CodeBlock code={`// lib/services/yocloud_service.dart

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../models/cloud_file.dart';

class YoCloudService {
  static String get _apiKey => dotenv.env['YOCLOUD_API_KEY'] ?? '';
  static String get _baseUrl => dotenv.env['YOCLOUD_BASE_URL'] ?? '';

  static Map<String, String> get _headers => {
    'X-API-Key': _apiKey,
    'Content-Type': 'application/json',
  };

  /// List all files
  static Future<List<CloudFile>> listFiles({int limit = 50, int offset = 0}) async {
    final uri = Uri.parse('$_baseUrl/files?limit=$limit&offset=$offset');
    final response = await http.get(uri, headers: _headers);

    if (response.statusCode != 200) {
      throw Exception('Failed to load files: \${response.body}');
    }

    final data = jsonDecode(response.body);
    return (data['files'] as List).map((f) => CloudFile.fromJson(f)).toList();
  }

  /// Upload a file
  static Future<CloudFile> uploadFile({
    required String name,
    required String contentBase64,
    String? mimeType,
  }) async {
    final uri = Uri.parse('$_baseUrl/files/upload');
    final body = jsonEncode({
      'name': name,
      'content_base64': contentBase64,
      if (mimeType != null) 'mime_type': mimeType,
    });

    final response = await http.post(uri, headers: _headers, body: body);

    if (response.statusCode != 200) {
      throw Exception('Upload failed: \${response.body}');
    }

    final data = jsonDecode(response.body);
    return CloudFile.fromJson(data['file']);
  }

  /// Delete a file
  static Future<void> deleteFile(String id) async {
    final uri = Uri.parse('$_baseUrl/files/$id');
    final response = await http.delete(uri, headers: _headers);

    if (response.statusCode != 200) {
      throw Exception('Delete failed: \${response.body}');
    }
  }

  /// Create a folder
  static Future<CloudFile> createFolder(String name) async {
    final uri = Uri.parse('$_baseUrl/folders');
    final body = jsonEncode({'name': name});
    final response = await http.post(uri, headers: _headers, body: body);

    if (response.statusCode != 200) {
      throw Exception('Create folder failed: \${response.body}');
    }

    final data = jsonDecode(response.body);
    return CloudFile.fromJson(data['folder']);
  }
}`} lang="dart" {...codeProps} />
      </section>

      <section id="flutter-models">
        <StepHeader step={4} title="Create Data Models" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">lib/models/cloud_file.dart</code>:
        </p>
        <CodeBlock code={`// lib/models/cloud_file.dart

class CloudFile {
  final String id;
  final String name;
  final String? mimeType;
  final int? size;
  final bool isFolder;
  final bool isStarred;
  final String? cloudinaryUrl;
  final DateTime createdAt;

  CloudFile({
    required this.id,
    required this.name,
    this.mimeType,
    this.size,
    required this.isFolder,
    this.isStarred = false,
    this.cloudinaryUrl,
    required this.createdAt,
  });

  factory CloudFile.fromJson(Map<String, dynamic> json) {
    return CloudFile(
      id: json['id'],
      name: json['name'],
      mimeType: json['mime_type'],
      size: json['size'],
      isFolder: json['is_folder'] ?? false,
      isStarred: json['is_starred'] ?? false,
      cloudinaryUrl: json['cloudinary_url'],
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  String get formattedSize {
    if (size == null) return '—';
    if (size! < 1024) return '\${size} B';
    if (size! < 1024 * 1024) return '\${(size! / 1024).toStringAsFixed(1)} KB';
    return '\${(size! / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}`} lang="dart" {...codeProps} />
      </section>

      <section id="flutter-provider">
        <StepHeader step={5} title="Create State Provider" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">lib/providers/file_provider.dart</code>:
        </p>
        <CodeBlock code={`// lib/providers/file_provider.dart

import 'package:flutter/material.dart';
import '../models/cloud_file.dart';
import '../services/yocloud_service.dart';

class FileProvider with ChangeNotifier {
  List<CloudFile> _files = [];
  bool _loading = false;
  String? _error;

  List<CloudFile> get files => _files;
  bool get loading => _loading;
  String? get error => _error;

  Future<void> fetchFiles() async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _files = await YoCloudService.listFiles();
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> uploadFile(String name, String base64, String? mimeType) async {
    try {
      await YoCloudService.uploadFile(
        name: name,
        contentBase64: base64,
        mimeType: mimeType,
      );
      await fetchFiles(); // Refresh list
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<void> deleteFile(String id) async {
    try {
      await YoCloudService.deleteFile(id);
      _files.removeWhere((f) => f.id == id);
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }
}`} lang="dart" {...codeProps} />
      </section>

      <section id="flutter-list">
        <StepHeader step={6} title="Build the File List Screen" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Create <code className="text-primary font-mono">lib/screens/file_list_screen.dart</code>:
        </p>
        <CodeBlock code={`// lib/screens/file_list_screen.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/file_provider.dart';

class FileListScreen extends StatefulWidget {
  const FileListScreen({super.key});

  @override
  State<FileListScreen> createState() => _FileListScreenState();
}

class _FileListScreenState extends State<FileListScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() =>
        Provider.of<FileProvider>(context, listen: false).fetchFiles());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Cloud Files'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () =>
                Provider.of<FileProvider>(context, listen: false).fetchFiles(),
          ),
        ],
      ),
      body: Consumer<FileProvider>(
        builder: (context, provider, _) {
          if (provider.loading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.error != null) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.error_outline, size: 48, color: Colors.red[300]),
                  const SizedBox(height: 8),
                  Text(provider.error!, style: TextStyle(color: Colors.red[600])),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: provider.fetchFiles,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (provider.files.isEmpty) {
            return const Center(
              child: Text('No files yet. Upload one!',
                  style: TextStyle(color: Colors.grey)),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: provider.files.length,
            itemBuilder: (context, index) {
              final file = provider.files[index];
              return Card(
                child: ListTile(
                  leading: Icon(
                    file.isFolder ? Icons.folder : Icons.insert_drive_file,
                    color: file.isFolder ? Colors.amber : Colors.blue,
                    size: 32,
                  ),
                  title: Text(file.name, overflow: TextOverflow.ellipsis),
                  subtitle: Text(
                    file.isFolder
                        ? 'Folder'
                        : '\${file.formattedSize} · \${file.mimeType ?? "Unknown"}',
                  ),
                  trailing: file.isFolder
                      ? null
                      : IconButton(
                          icon: const Icon(Icons.delete_outline, color: Colors.red),
                          onPressed: () => provider.deleteFile(file.id),
                        ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}`} lang="dart" {...codeProps} />
      </section>

      <section id="flutter-upload">
        <StepHeader step={7} title="Add Upload Functionality" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Add a FAB to the file list screen for uploading. Update the <code className="text-primary font-mono">Scaffold</code> in file_list_screen.dart:
        </p>
        <CodeBlock code={`// Add this to FileListScreen's Scaffold:

floatingActionButton: FloatingActionButton(
  onPressed: () => _pickAndUpload(context),
  child: const Icon(Icons.upload_file),
),

// Add this method to _FileListScreenState:

Future<void> _pickAndUpload(BuildContext context) async {
  final result = await FilePicker.platform.pickFiles(
    type: FileType.any,
    withData: true,
  );

  if (result != null && result.files.isNotEmpty) {
    final file = result.files.first;
    if (file.bytes == null) return;

    final base64 = base64Encode(file.bytes!);
    final provider = Provider.of<FileProvider>(context, listen: false);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Uploading \${file.name}...')),
    );

    await provider.uploadFile(file.name, base64, null);

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('✅ Uploaded: \${file.name}')),
      );
    }
  }
}

// Don't forget the imports at the top:
import 'dart:convert';
import 'package:file_picker/file_picker.dart';`} lang="dart" {...codeProps} />
      </section>

      <section id="flutter-main">
        <StepHeader step={8} title="Update main.dart" />
        <p className="text-[11px] text-muted-foreground mb-3">
          Update <code className="text-primary font-mono">lib/main.dart</code> to initialize the app:
        </p>
        <CodeBlock code={`// lib/main.dart

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';
import 'providers/file_provider.dart';
import 'screens/file_list_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => FileProvider()),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'YoCloud Files',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: Colors.blue,
        useMaterial3: true,
      ),
      home: const FileListScreen(),
    );
  }
}`} lang="dart" {...codeProps} />
      </section>

      <section id="flutter-run">
        <StepHeader step={9} title="Run the App" last />
        <p className="text-[11px] text-muted-foreground mb-3">
          Run on your connected device or emulator:
        </p>
        <CodeBlock code={`# Android Emulator
flutter run

# iOS Simulator
flutter run -d iphone

# Chrome (Web)
flutter run -d chrome

# macOS Desktop
flutter run -d macos`} lang="bash" {...codeProps} />

        <div className="mt-4 p-4 rounded-xl border border-border bg-secondary/20">
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-primary" />
            Final Project Structure
          </h3>
          <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre">{`my_yocloud_app/
├── .env                              ← API key (git-ignored)
├── lib/
│   ├── main.dart                     ← App entry point
│   ├── models/
│   │   └── cloud_file.dart           ← Data model
│   ├── services/
│   │   └── yocloud_service.dart      ← API client
│   ├── providers/
│   │   └── file_provider.dart        ← State management
│   └── screens/
│       └── file_list_screen.dart     ← UI screen
├── pubspec.yaml
└── .gitignore`}</pre>
        </div>
      </section>

      <section id="flutter-tips">
        <div className="p-4 rounded-xl border border-border bg-primary/5">
          <h3 className="text-sm font-bold text-foreground mb-2">💡 Pro Tips</h3>
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Use <strong className="text-foreground">Riverpod</strong> for more advanced state management with auto-dispose and family providers</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Add <strong className="text-foreground">cached_network_image</strong> package for efficient image preview loading</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Use <strong className="text-foreground">Dio</strong> instead of http package for advanced features like interceptors and cancellation</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Implement <strong className="text-foreground">--dart-define</strong> flags for compile-time API key injection in production builds</span></li>
            <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /><span>Use <strong className="text-foreground">GoRouter</strong> for declarative navigation with folder drill-down</span></li>
          </ul>
        </div>
      </section>
    </>
  );
}

function StepHeader({ step, title, last }: { step: number; title: string; last?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
      <h3 className="text-base md:text-lg font-bold text-foreground">{title}</h3>
    </div>
  );
}
